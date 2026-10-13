// Un solo posto che risponde a "quali impegni ci sono in questo intervallo":
// mette insieme gli eventi di Google Calendar (tutti i calendari selezionati,
// solo se l'account è collegato) e gli impegni salvati in locale nell'app
// (state.calendario.eventiManuali — quelli aggiunti quando Google non è
// collegato, o dalla barra di cattura). Lo usano la card Calendario della
// Home e il riassunto del giorno.
import { readState, updateState } from "./store.js";
import { categoriaEvento, coloreCategoria } from "./event-colors.js";
import {
  configurato,
  otteniAccessTokenValido,
  listaEventi,
  listaCalendari,
  eventoDaGoogle,
  CALENDARIO_PRINCIPALE,
} from "./google-calendar.js";

// Cache in memoria di processo, una voce per intervallo+calendari richiesti.
const cache = new Map();
const CACHE_MS = 60 * 1000;

export async function accessTokenValido(state) {
  const google = state.integrazioni?.googleCalendar;
  if (!google?.refreshToken) return null;
  async function salvaIntegrazione(aggiornata) {
    await updateState((s) => {
      if (!s.integrazioni) s.integrazioni = {};
      s.integrazioni.googleCalendar = { ...s.integrazioni.googleCalendar, ...aggiornata };
      return s;
    });
  }
  return otteniAccessTokenValido(google, salvaIntegrazione);
}

// I calendari da leggere: quelli scelti dall'utente nelle impostazioni della
// card; se non ha ancora scelto nulla, solo il principale.
export function calendariSelezionati(state) {
  const scelti = state.integrazioni?.googleCalendar?.calendariSelezionati;
  return Array.isArray(scelti) && scelti.length ? scelti : [CALENDARIO_PRINCIPALE];
}

export function invalidaCache() {
  cache.clear();
}

function eventiLocali(state, rangeStart, rangeEnd) {
  return (state.calendario?.eventiManuali || [])
    .filter((e) => e.start && new Date(e.start) >= rangeStart && new Date(e.start) <= rangeEnd)
    .map((e) => ({
      id: e.id,
      summary: e.summary,
      start: e.start,
      end: e.end || null,
      luogo: e.luogo || null,
      categoria: e.categoria || categoriaEvento(e.summary),
      colore: e.colore || coloreCategoria(categoriaEvento(e.summary)),
      coloreManuale: Boolean(e.coloreManuale),
      fonte: "locale",
      calendarioId: null,
      calendarioNome: "Nell'app",
    }));
}

// Restituisce { connesso, events, error }. Non lancia mai: se Google non
// risponde, tornano almeno gli impegni locali (più l'errore da mostrare).
export async function eventiNellIntervallo(rangeStart, rangeEnd) {
  const state = await readState();
  const locali = eventiLocali(state, rangeStart, rangeEnd);

  if (!configurato()) return { connesso: false, events: locali, error: null };
  let accessToken = null;
  try {
    accessToken = await accessTokenValido(state);
  } catch (err) {
    return { connesso: true, events: locali, error: `Rinnovo del collegamento Google fallito: ${err.message}` };
  }
  if (!accessToken) return { connesso: false, events: locali, error: null };

  const ids = calendariSelezionati(state);
  const cacheKey = `${rangeStart.toISOString()}|${rangeEnd.toISOString()}|${ids.join(",")}`;
  const now = Date.now();
  const cached = cache.get(cacheKey);
  if (cached && now - cached.timestamp < CACHE_MS) {
    return { connesso: true, events: [...cached.events, ...locali], error: null };
  }

  try {
    // Nome e colore di ogni calendario, per etichettare gli eventi.
    let calendari = [];
    try {
      calendari = await listaCalendari(accessToken);
    } catch {
      calendari = [];
    }
    const perId = new Map(calendari.map((c) => [c.id, c]));
    const liste = await Promise.all(
      ids.map(async (id) => {
        const cal = perId.get(id) || (id === CALENDARIO_PRINCIPALE ? calendari.find((c) => c.principale) : null) || { id, nome: null, colore: null };
        try {
          const grezzi = await listaEventi(accessToken, rangeStart, rangeEnd, id);
          return grezzi.map((ev) => eventoDaGoogle(ev, categoriaEvento, coloreCategoria, cal));
        } catch {
          return []; // un calendario non più accessibile non deve bloccare gli altri
        }
      })
    );
    const events = liste.flat().sort((a, b) => new Date(a.start) - new Date(b.start));
    cache.set(cacheKey, { timestamp: now, events });
    return { connesso: true, events: [...events, ...locali], error: null };
  } catch (err) {
    return { connesso: true, events: [...(cached?.events || []), ...locali], error: String(err?.message || err) };
  }
}

// Gli impegni di un singolo giorno (chiave YYYY-MM-DD), per il riassunto.
export async function eventiDelGiorno(dataChiave) {
  const inizio = new Date(`${dataChiave}T00:00:00`);
  const fine = new Date(`${dataChiave}T23:59:59`);
  const { events } = await eventiNellIntervallo(inizio, fine);
  return events;
}

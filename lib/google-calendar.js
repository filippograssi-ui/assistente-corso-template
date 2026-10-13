// Integrazione Google Calendar (OAuth 2.0) — lettura/scrittura/modifica/
// eliminazione vere sul calendario di Filippo, al posto del vecchio feed
// iCal (GOOGLE_CALENDAR_ICAL_URL), che era in sola lettura e non dava un id
// evento utilizzabile per modificare o cancellare. Stesso schema OAuth già
// usato per Strava (lib/strava.js): authorize → callback → refresh.
//
// Scope minimo necessario per creare/leggere/modificare/eliminare eventi
// (non serve gestire elenco calendari o impostazioni account):
// https://www.googleapis.com/auth/calendar.events
const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API_BASE = "https://www.googleapis.com/calendar/v3";
// Due permessi: scrivere/leggere gli eventi (calendar.events) e leggere
// l'ELENCO dei calendari dell'account (calendar.readonly) — serve per far
// scegliere quali calendari mostrare, compresi quelli condivisi (es. il
// calendario della scuola condiviso dalla segreteria).
const SCOPE = "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly";

// Gli eventi creati dall'app vanno sempre sul calendario principale
// dell'account collegato; in lettura invece si leggono tutti i calendari
// che l'utente ha selezionato (vedi calendariSelezionati nello stato).
export const CALENDARIO_PRINCIPALE = "primary";
const CALENDAR_ID = CALENDARIO_PRINCIPALE;

export function configurato() {
  return Boolean(process.env.GOOGLE_CALENDAR_CLIENT_ID && process.env.GOOGLE_CALENDAR_CLIENT_SECRET);
}

export function costruisciUrlAutorizzazione(redirectUri) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    // "consent" forza Google a restituire sempre un refresh_token, anche se
    // Filippo avesse già autorizzato l'app in passato (altrimenti un secondo
    // consenso può arrivare senza refresh_token, lasciando il collegamento
    // solo temporaneo).
    prompt: "consent",
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

export async function scambiaCodice(code, redirectUri) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID,
      client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Scambio codice fallito (${res.status}): ${await res.text().catch(() => "")}`);
  return res.json(); // { access_token, refresh_token, expires_in, scope, token_type }
}

async function rinnovaToken(refreshToken) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CALENDAR_CLIENT_ID,
      client_secret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Rinnovo token fallito (${res.status}): ${await res.text().catch(() => "")}`);
  return res.json(); // { access_token, expires_in, scope, token_type } — Google NON ruota il refresh_token
}

// Ritorna un access token valido per l'integrazione salvata in stato,
// rinnovandolo se scaduto (Google non restituisce un nuovo refresh_token al
// rinnovo: si tiene sempre quello ottenuto la prima volta). Ritorna null se
// l'integrazione non è configurata/collegata.
export async function otteniAccessTokenValido(google, salvaIntegrazione) {
  if (!google?.refreshToken) return null;
  const oraSecondi = Math.floor(Date.now() / 1000);
  if (google.accessToken && google.scadenza && google.scadenza > oraSecondi + 60) {
    return google.accessToken;
  }
  const rinnovato = await rinnovaToken(google.refreshToken);
  const aggiornata = {
    ...google,
    accessToken: rinnovato.access_token,
    scadenza: oraSecondi + (rinnovato.expires_in || 3600),
  };
  await salvaIntegrazione(aggiornata);
  return aggiornata.accessToken;
}

// ============================================================
// Conversione evento PersonalOS <-> evento Google Calendar
// ============================================================

// Il luogo usa il campo nativo di Google ("location"), così è visibile e
// ricercabile anche dall'app/sito di Google Calendar, non solo qui.
// Colore/colore-manuale (quando scelto a mano dalla tavolozza, invece che
// dedotto dalla parola chiave del titolo) vive in extendedProperties.private:
// invisibile nell'interfaccia di Google, leggibile solo dalla nostra API.
export function eventoAGoogle({ summary, start, end, luogo, colore, coloreManuale }, timezone) {
  const inizio = new Date(start);
  const fine = end ? new Date(end) : new Date(inizio.getTime() + 60 * 60 * 1000);
  const corpo = {
    summary,
    start: { dateTime: inizio.toISOString(), timeZone: timezone },
    end: { dateTime: fine.toISOString(), timeZone: timezone },
  };
  if (luogo) corpo.location = luogo;
  // Sempre scritto (mai condizionale): un valore "0"/colore-categoria
  // sovrascrive in modo pulito un'eventuale scelta manuale precedente in
  // caso di modifica, senza dover cancellare una chiave dalla mappa
  // extendedProperties (semantiche di merge poco affidabili lato API).
  if (colore) {
    corpo.extendedProperties = { private: { personalosColore: colore, personalosColoreManuale: coloreManuale ? "1" : "0" } };
  }
  return corpo;
}

// Converte un evento restituito da Google nel formato usato dall'app.
// categoriaFn/coloreCategoriaFn sono passate da fuori (lib/event-colors.js)
// per non creare una dipendenza circolare e restare funzioni di libreria pure.
export function eventoDaGoogle(ev, categoriaFn, coloreCategoriaFn, calendario = null) {
  const start = ev.start?.dateTime || (ev.start?.date ? `${ev.start.date}T00:00:00` : null);
  const end = ev.end?.dateTime || (ev.end?.date ? `${ev.end.date}T00:00:00` : null);
  const coloreManuale = ev.extendedProperties?.private?.personalosColoreManuale === "1";
  const coloreSalvato = ev.extendedProperties?.private?.personalosColore || null;
  const categoria = categoriaFn(ev.summary || "");
  return {
    id: ev.id,
    summary: ev.summary || "(senza titolo)",
    start,
    end,
    luogo: ev.location || null,
    categoria,
    colore: coloreManuale && coloreSalvato ? coloreSalvato : categoria !== "generale" ? coloreCategoriaFn(categoria) : calendario?.colore || coloreCategoriaFn(categoria),
    coloreManuale,
    fonte: "google",
    calendarioId: calendario?.id || CALENDARIO_PRINCIPALE,
    calendarioNome: calendario?.nome || null,
    // Un evento ricorrente espanso (singleEvents:true) ha un id di occorrenza
    // dedicato: modificarlo/eliminarlo tocca solo quella occorrenza, mai
    // l'intera serie — comportamento nativo di Google, nessuna logica in più.
    ricorrente: Boolean(ev.recurringEventId),
  };
}

// ============================================================
// Chiamate API
// ============================================================

async function chiamata(accessToken, path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!res.ok) {
    const corpo = await res.text().catch(() => "");
    throw new Error(`Google Calendar API (${path}) fallita (${res.status}): ${corpo}`);
  }
  if (res.status === 204) return null; // DELETE risponde senza corpo
  return res.json();
}

// Elenco dei calendari visibili nell'account (principale, condivisi,
// festività...), con id, nome e colore assegnato da Google.
export async function listaCalendari(accessToken) {
  const risposta = await chiamata(accessToken, "/users/me/calendarList?minAccessRole=reader&showHidden=false");
  return (risposta.items || []).map((c) => ({
    id: c.id,
    nome: c.summaryOverride || c.summary || c.id,
    colore: c.backgroundColor || null,
    principale: Boolean(c.primary),
  }));
}

export async function listaEventi(accessToken, timeMin, timeMax, calendarId = CALENDAR_ID) {
  const params = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "2500",
  });
  const risposta = await chiamata(accessToken, `/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`);
  // Eventi cancellati/annullati (status "cancelled") possono comparire nella
  // sincronizzazione incrementale di Google: qui filtrati, non ci serve.
  return (risposta.items || []).filter((ev) => ev.status !== "cancelled");
}

export async function creaEvento(accessToken, corpoEvento) {
  return chiamata(accessToken, `/calendars/${encodeURIComponent(CALENDAR_ID)}/events`, {
    method: "POST",
    body: JSON.stringify(corpoEvento),
  });
}

export async function aggiornaEvento(accessToken, eventId, corpoParziale) {
  return chiamata(accessToken, `/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${encodeURIComponent(eventId)}`, {
    method: "PATCH",
    body: JSON.stringify(corpoParziale),
  });
}

export async function eliminaEvento(accessToken, eventId) {
  try {
    await chiamata(accessToken, `/calendars/${encodeURIComponent(CALENDAR_ID)}/events/${encodeURIComponent(eventId)}`, {
      method: "DELETE",
    });
  } catch (err) {
    // Un evento già cancellato manualmente da Google Calendar (es. dal
    // telefono) risponde 410/404: per noi il risultato voluto (l'evento non
    // c'è più) è comunque raggiunto, non è un errore da segnalare.
    if (!/\(404\)|\(410\)/.test(err.message)) throw err;
  }
}

// Il riassunto del giorno per la Home: raccoglie i dati di tutte le sezioni
// e li fa riassumere al modello in poche righe di prosa. Si genera SOLO
// premendo il pulsante "Rigenera" (o, nel Percorso Completo, una volta al
// mattino dal cron) — mai all'apertura della pagina.
import Anthropic from "@anthropic-ai/sdk";
import { MODELLO_QUALITA } from "./models.js";
import { readState, readDailyLogsRange } from "./store.js";
import { getTodayKey, addDaysToKey, getTimezone } from "./date.js";
import { computeStreak } from "./habits.js";
import { eventiDelGiorno } from "./calendar-eventi.js";
import { blocchiDelGiorno, chiaveGiornoOrario } from "./scuola-agenda.js";

const GIORNI_FINESTRA_STREAK = 400;

const SYSTEM_PROMPT =
  "Scrivi un riassunto quotidiano per la Home di un assistente personale di un docente, in italiano, " +
  "in un massimo di 6-8 righe di prosa (niente elenchi puntati, niente titoli). Copre, in questo " +
  "ordine quando ci sono dati: come sta andando in generale la giornata (una riga d'apertura), " +
  "impegni di oggi e domani, scuola (le classi e le ore di oggi e di domani, con gli appunti o le cose da " +
  "fare segnate per quelle lezioni), cose da fare e promemoria aperti, obiettivi della settimana, " +
  "salute (streak abitudini, allenamenti, peso solo se cambia in modo sensato). Se una sezione non ha " +
  "dati significativi, saltala del tutto: non scrivere che è vuota o che manca. Tono diretto, " +
  "colloquiale, mai entusiasta o pieno di punti esclamativi. Nessun saluto, nessuna firma, nessuna " +
  "introduzione: rispondi solo col testo.";

export async function raccogliDatiHome() {
  const oggi = getTodayKey();
  const domani = addDaysToKey(oggi, 1);
  const inizioStreak = addDaysToKey(oggi, -(GIORNI_FINESTRA_STREAK - 1));
  const [eventiOggi, eventiDomani, state, logs] = await Promise.all([
    eventiDelGiorno(oggi),
    eventiDelGiorno(domani),
    readState(),
    readDailyLogsRange(inizioStreak, oggi),
  ]);

  const taskAperti = (state.crm || []).filter((i) => !i.dataCompletamento);
  const promemoria = (state.promemoria || []).filter((p) => !p.fatto);
  const obiettivi = (state.obiettivi?.settimana || []).filter((o) => !o.fatto);

  function scuolaDelGiorno(chiave) {
    const giornoSettimana = chiaveGiornoOrario(new Date(`${chiave}T12:00:00`));
    if (!giornoSettimana) return [];
    return blocchiDelGiorno(state.scuola, chiave, giornoSettimana).map((b) => ({
      classe: b.classe,
      ore: b.ore,
      appunti: (b.pagina?.appunti || "").slice(0, 300),
      daFare: (b.pagina?.checklist || []).filter((c) => !c.fatto).map((c) => c.testo),
    }));
  }

  const pesoLog = (state.salute?.pesoLog || []).slice().sort((a, b) => (a.data < b.data ? -1 : 1));
  const settimanaFa = addDaysToKey(oggi, -6);
  const allenamenti = (state.salute?.allenamenti || []).filter((a) => a.data >= settimanaFa && a.data <= oggi);

  return {
    data: oggi,
    impegni: {
      oggi: eventiOggi.map((e) => ({ titolo: e.summary, ora: e.start, luogo: e.luogo || null })),
      domani: eventiDomani.map((e) => ({ titolo: e.summary, ora: e.start, luogo: e.luogo || null })),
    },
    scuola: { oggi: scuolaDelGiorno(oggi), domani: scuolaDelGiorno(domani) },
    daFare: taskAperti.slice(0, 15).map((t) => ({ titolo: t.titolo, fascia: t.fascia })),
    promemoria: promemoria.slice(0, 15).map((p) => ({ testo: p.testo, scadenza: p.scadenza || null })),
    obiettiviSettimana: obiettivi.map((o) => o.testo),
    salute: {
      streakAbitudini: computeStreak(logs, getTimezone()),
      pesoUltimoKg: pesoLog[pesoLog.length - 1]?.kg ?? null,
      allenamentiUltimi7Giorni: allenamenti.length,
    },
  };
}

export async function generaRiassuntoHome() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { testo: null, errore: "ANTHROPIC_API_KEY non configurata in .env.local" };
  const dati = await raccogliDatiHome();
  try {
    const client = new Anthropic({ apiKey });
    const risposta = await client.messages.create({
      model: MODELLO_QUALITA,
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: JSON.stringify(dati) }],
    });
    const blocco = risposta.content.find((b) => b.type === "text");
    const testo = blocco?.text?.trim() || null;
    return { testo, errore: testo ? null : "Risposta vuota dal modello" };
  } catch (err) {
    return { testo: null, errore: `Chiamata al modello fallita: ${err.message || "errore sconosciuto"}` };
  }
}

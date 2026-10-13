// Rassegne generate con il modello + ricerca web: le notizie sugli argomenti
// scelti dall'utente e i trend di moda del momento. Stessa meccanica per
// entrambe: una chiamata al modello con lo strumento web_search, risposta in
// prosa breve, salvata nello stato e rigenerata solo su richiesta.
import Anthropic from "@anthropic-ai/sdk";
import { MODELLO_QUALITA } from "./models.js";

const REGOLE_COMUNI = `Scrivi in italiano, in prosa, con un breve paragrafo per ogni punto (vai a capo tra un
paragrafo e l'altro, niente titoli, niente elenchi puntati, niente asterischi o markdown). Tono neutro e
diretto, mai sensazionalistico, niente punti esclamativi. Nessun saluto, nessuna introduzione, nessuna
conclusione: rispondi solo con il testo. Alla fine di ogni paragrafo, tra parentesi, il nome della fonte
principale da cui viene (es. "(Ansa)").`;

function pulisci(risposta) {
  return risposta.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .replace(/\*\*/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function chiama(system, richiesta) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { testo: null, errore: "ANTHROPIC_API_KEY non configurata in .env.local" };
  try {
    const client = new Anthropic({ apiKey });
    const risposta = await client.messages.create({
      model: MODELLO_QUALITA,
      max_tokens: 1500,
      system,
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 8 }],
      messages: [{ role: "user", content: richiesta }],
    });
    const testo = pulisci(risposta);
    return { testo: testo || null, errore: testo ? null : "Risposta vuota dal modello" };
  } catch (err) {
    return { testo: null, errore: `Chiamata al modello fallita: ${err.message || "errore sconosciuto"}` };
  }
}

// Notizie: solo sugli argomenti scelti (es. "scuola e istruzione", "Inter",
// "intelligenza artificiale") — una rassegna di oggi, 1-2 notizie per argomento.
export async function generaNotizie(argomenti) {
  const system = `Sei la rassegna stampa personale di un utente. Usa lo strumento di ricerca web per trovare le
notizie più recenti e rilevanti (idealmente di oggi o degli ultimi giorni) SOLO sugli argomenti che ti
indica — ignora tutto il resto, anche se importante. Per ogni argomento 1 o 2 notizie, massimo 10 paragrafi
in tutto. Se per un argomento non trovi nulla di recente, dillo in una riga sola. ${REGOLE_COMUNI}`;
  return chiama(system, `Argomenti che mi interessano: ${argomenti.join("; ")}. Fammi la rassegna di oggi.`);
}

// Trend di moda attuali, filtrati sulle preferenze scritte dall'utente
// (stile, genere, budget...) se ce ne sono.
export async function generaTrendModa(preferenze) {
  const system = `Sei un osservatore di moda. Usa lo strumento di ricerca web per trovare i trend di moda del momento
(stagione in corso: capi, colori, materiali, accessori, stili che vanno adesso), da fonti recenti di
riviste e siti di moda. Massimo 6-8 paragrafi, ognuno su un trend concreto, con un cenno a come portarlo
nella vita di tutti i giorni. ${REGOLE_COMUNI}`;
  const richiesta = preferenze
    ? `Le mie preferenze: ${preferenze}. Dimmi quali trend di adesso fanno per me.`
    : "Dimmi quali sono i trend di moda di adesso.";
  return chiama(system, richiesta);
}

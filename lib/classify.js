// Riceve un testo e decide dove va: una delle otto destinazioni fisse.
// Se il modello non risponde (chiave mancante, credito finito, rete giù), ripiega
// su regole basate su parole chiave — la cattura non fallisce mai, al massimo smista peggio.

import Anthropic from "@anthropic-ai/sdk";
import { getTodayKey, getTimezone } from "./date.js";
import { MODELLO_VELOCE } from "./models.js";

export const DESTINAZIONI = [
  "task",
  "persone",
  "finanze",
  "nutrizione",
  "salute",
  "obiettivi",
  "memoria",
  "calendario",
];

const URGENZE = ["oggi", "settimana", "più avanti"];

// Il calendario richiede di capire "lunedì prossimo", "il 20", "domani alle 15" —
// cosa che le regole a parole chiave non possono fare in modo affidabile. Per
// questo classifyWithRules() non propone mai "calendario": senza il modello che
// calcola una data vera, meglio smistare altrove che creare un evento a caso.
function buildSystemPrompt() {
  const oggi = new Date();
  const giorno = new Intl.DateTimeFormat("it-IT", { weekday: "long", timeZone: getTimezone() }).format(oggi);
  const dataIso = getTodayKey();
  return `Sei il classificatore di un assistente personale, un sistema di cattura pensieri.
Oggi è ${giorno} ${dataIso} (fuso orario ${getTimezone()}).
Ricevi una frase scritta o detta da una persona e devi decidere in quale di queste otto
destinazioni va archiviata: ${DESTINAZIONI.join(", ")}.
- "task" è il generico "da fare", per tutto quello che non ha una casa più precisa.
- "persone" per impegni legati esplicitamente a una persona da richiamare/rispondere.
- "finanze", "nutrizione", "salute", "obiettivi" per i rispettivi ambiti.
- "memoria" per pensieri, riflessioni o informazioni da ricordare senza un'azione associata.
- "calendario" per qualunque impegno con una data/ora precisa o deducibile (riunioni,
  appuntamenti, eventi, "il 20 alle 15", "lunedì prossimo", "domani mattina", ecc.) che la
  persona vuole vedere nel calendario. In questo caso calcola la data vera partendo da
  "oggi" sopra e restituiscila nel campo "data" in formato ISO: "AAAA-MM-GG" se non è
  specificata un'ora, "AAAA-MM-GGTHH:MM" se lo è. Se capisci che si parla di scuola,
  verifiche, interrogazioni o professori, scrivilo per esteso nel titolo (aiuta a
  colorare l'evento di conseguenza).
Rispondi SOLO con un oggetto JSON, senza testo prima o dopo, con questa forma esatta:
{"destinazione": "...", "titolo": "riformulazione breve", "persona": "nome o null", "urgenza": "oggi|settimana|più avanti", "data": "AAAA-MM-GG oppure AAAA-MM-GGTHH:MM oppure null"}
Il campo "data" ha senso solo per "calendario": per tutte le altre destinazioni metti null.
Se non sei sicuro dell'urgenza, usa "oggi". Non usare mai "in ritardo" come urgenza: in ritardo ci si finisce, non ci si nasce.`;
}

// Estrae il primo oggetto JSON da un testo, anche se il modello ci ha messo
// del testo intorno (succede, anche chiedendo "solo JSON").
function extractJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

// "AAAA-MM-GG" o "AAAA-MM-GGTHH:MM" — qualunque altra cosa (compreso null/undefined
// o del testo libero che il modello avesse messo lì per sbaglio) diventa null.
function validateData(valore) {
  if (typeof valore !== "string") return null;
  const v = valore.trim();
  if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(v)) return v;
  return null;
}

function validateClassification(obj) {
  if (!obj || typeof obj !== "object") return null;
  if (!DESTINAZIONI.includes(obj.destinazione)) return null;
  const urgenza = URGENZE.includes(obj.urgenza) ? obj.urgenza : "oggi";
  return {
    destinazione: obj.destinazione,
    titolo: typeof obj.titolo === "string" && obj.titolo.trim() ? obj.titolo.trim() : null,
    persona: typeof obj.persona === "string" && obj.persona.trim() ? obj.persona.trim() : null,
    urgenza,
    data: obj.destinazione === "calendario" ? validateData(obj.data) : null,
  };
}

// Rete di sicurezza: regole su parole chiave. Entra in funzione quando il
// modello non è raggiungibile o la chiave manca — non deve mai lanciare.
function classifyWithRules(testo) {
  const t = testo.toLowerCase();

  const has = (...words) => words.some((w) => t.includes(w));

  let destinazione = "task";
  if (has("euro", "€", "fattura", "pagat", "spes", "conto corrente", "bonifico")) {
    destinazione = "finanze";
  } else if (has("chiamare", "richiamare", "rispondere", "scrivere a")) {
    destinazione = "persone";
  } else if (has("mangiat", "pranzo", "cena", "colazione", "kcal", "calorie")) {
    destinazione = "nutrizione";
  } else if (has("peso", "allenamento", "corsa", "palestra", "dottore", "medico")) {
    destinazione = "salute";
  } else if (has("obiettivo", "entro la settimana", "entro il mese", "promesso")) {
    destinazione = "obiettivi";
  } else if (has("ricorda", "ricordati", "nota", "pensiero")) {
    destinazione = "memoria";
  }

  return {
    destinazione,
    titolo: testo.slice(0, 120),
    persona: null,
    urgenza: "oggi",
    data: null,
  };
}

// Punto d'ingresso. Restituisce sempre { destinazione, titolo, persona, urgenza, data, via }
// dove "via" è "modello" oppure "regole" — la dashboard lo mostra in modo discreto.
export async function classify(testo) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { ...classifyWithRules(testo), via: "regole" };
  }

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: MODELLO_VELOCE,
      max_tokens: 300,
      system: buildSystemPrompt(),
      messages: [{ role: "user", content: testo }],
      // Niente ragionamento esteso qui: smistare una frase non migliora pensandoci
      // su, e con l'opzione accesa l'attesa sale da secondi a molti di più.
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const parsed = textBlock ? extractJson(textBlock.text) : null;
    const validated = validateClassification(parsed);

    if (!validated) {
      return { ...classifyWithRules(testo), via: "regole" };
    }
    return { ...validated, via: "modello" };
  } catch {
    return { ...classifyWithRules(testo), via: "regole" };
  }
}

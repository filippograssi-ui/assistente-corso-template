import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { MODELLO_QUALITA } from "@/lib/models";
import { readState } from "@/lib/store";
import { AMBITI_SVAGO, ambitoSvagoValido } from "@/lib/svago";

export const dynamic = "force-dynamic";

// Estrae il primo oggetto JSON da un testo, anche se il modello ci ha messo
// del testo intorno (stessa difesa già usata in lib/classify.js).
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

// Vogliamo SEMPRE esattamente due proposte (l'utente ha chiesto di poter
// scegliere tra due alternative) — se il modello ne restituisce un numero
// diverso o malformate, trattiamo l'intera risposta come non valida piuttosto
// che mostrarne una sola o inventarne una seconda.
function validaProposte(obj) {
  if (!obj || !Array.isArray(obj.proposte)) return null;
  const proposte = obj.proposte
    .filter((p) => p && typeof p.titolo === "string" && p.titolo.trim())
    .slice(0, 2)
    .map((p) => ({
      titolo: p.titolo.trim().slice(0, 120),
      descrizione: typeof p.descrizione === "string" ? p.descrizione.trim().slice(0, 300) : "",
    }));
  return proposte.length === 2 ? proposte : null;
}

function buildSystemPrompt(info) {
  return `Sei il suggeritore della sezione Svago di un assistente personale. In questo ambito proponi ${info.cosaPlurale}.
Basati sui gusti dichiarati, su cosa gli è piaciuto in passato (le cose che ha già segnato come fatte) e sulle eventuali caratteristiche fisse che ha scelto per questo suggerimento: se sono indicate, le due proposte DEVONO rispettarle davvero, non solo in modo approssimativo.
Non riproporre mai qualcosa già presente nella sua lista, né tra le cose fatte né tra quelle ancora da fare.
Proponi ESATTAMENTE due alternative diverse tra loro, così che l'utente possa scegliere quella che preferisce.
Rispondi SOLO con un oggetto JSON, senza testo prima o dopo, con questa forma esatta:
{"proposte": [{"titolo": "breve, max 8 parole", "descrizione": "1-2 frasi sul perché potrebbe piacergli"}, {"titolo": "...", "descrizione": "..."}]}`;
}

// Descrive in italiano le caratteristiche fisse che l'utente ha già scelto
// PRIMA di chiedere il suggerimento (piattaforma/tipo/genere per Watch list,
// luogo per Uscite) — il modello deve rispettarle, non riproporle come sue.
function descriviCaratteristicheFisse(ambito, filtri) {
  if (ambito === "watchlist") {
    const parti = [`genere ${filtri.genere}`];
    if (filtri.tipo) parti.push(filtri.tipo === "Serie" ? "deve essere una serie TV" : "deve essere un film");
    if (filtri.piattaforma) parti.push(`disponibile su ${filtri.piattaforma}`);
    return `Caratteristiche fisse scelte dall'utente per questo suggerimento (obbligatorie): ${parti.join(", ")}.`;
  }
  if (ambito === "posti") {
    return `Deve trovarsi a/in "${filtri.luogo}" (o nei dintorni immediati) — caratteristica fissa scelta dall'utente, obbligatoria.`;
  }
  if (ambito === "libri" && filtri.genere) {
    return `Genere richiesto (obbligatorio): ${filtri.genere}. Proponi libri veri, esistenti, con titolo e autore reali.`;
  }
  return "";
}

// POST /api/svago/[ambito]/suggerisci
// Body: { richiesta?: string, filtri?: {...} } — filtri sono le
// caratteristiche fisse che l'utente sceglie PRIMA di chiedere il
// suggerimento (richiesta esplicita: "voglio poter scegliere le cose e poi
// tu mi suggerisci in base a quello"), non un aggiustamento delle proposte
// dopo che sono arrivate. Per Watch list il genere è obbligatorio, per
// Uscite lo è il luogo — stessa regola già richiesta per l'aggiunta manuale
// alla lista. richiesta resta la richiesta testuale libera facoltativa
// ("chiedimi cosa ti piacerebbe"), che si somma alle caratteristiche fisse.
export async function POST(request, { params }) {
  const { ambito } = await params;
  if (!ambitoSvagoValido(ambito)) return NextResponse.json({ error: "Ambito non valido" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const richiesta = typeof body?.richiesta === "string" ? body.richiesta.trim().slice(0, 500) : "";
  const filtriInput = body?.filtri && typeof body.filtri === "object" ? body.filtri : {};
  const filtri = {
    piattaforma: typeof filtriInput.piattaforma === "string" ? filtriInput.piattaforma.trim().slice(0, 60) : "",
    tipo: typeof filtriInput.tipo === "string" ? filtriInput.tipo.trim().slice(0, 20) : "",
    genere: typeof filtriInput.genere === "string" ? filtriInput.genere.trim().slice(0, 60) : "",
    luogo: typeof filtriInput.luogo === "string" ? filtriInput.luogo.trim().slice(0, 100) : "",
  };

  if (ambito === "watchlist" && !filtri.genere) {
    return NextResponse.json({ error: "Seleziona almeno il genere prima di generare suggerimenti" }, { status: 400 });
  }
  if (ambito === "posti" && !filtri.luogo) {
    return NextResponse.json({ error: "Indica il luogo prima di generare suggerimenti" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY non configurata in .env.local" }, { status: 400 });
  }

  const info = AMBITI_SVAGO[ambito];
  const state = await readState();
  const preferenze = state.svago?.preferenze?.[ambito] || "";
  const lista = state.svago?.[ambito] || [];
  const fatti = lista.filter((v) => v.fatto).map((v) => v.testo);
  const daFare = lista.filter((v) => !v.fatto).map((v) => v.testo);

  const caratteristicheFisse = descriviCaratteristicheFisse(ambito, filtri);

  const contesto = `
Gusti dichiarati dall'utente per questo ambito: ${preferenze || "(nessuno scritto esplicitamente)"}
Cose già segnate come fatte/viste (presumibilmente piaciute): ${JSON.stringify(fatti)}
Cose già in lista ma non ancora fatte (non riproporle): ${JSON.stringify(daFare)}
${caratteristicheFisse}
${richiesta ? `Richiesta specifica dell'utente in questo momento: "${richiesta}"` : "Nessuna richiesta testuale specifica in questo momento: proponi spontaneamente in base ai gusti e alle caratteristiche fisse sopra."}
`.trim();

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: MODELLO_QUALITA,
      max_tokens: 600,
      system: buildSystemPrompt(info),
      messages: [{ role: "user", content: contesto }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const parsed = textBlock ? extractJson(textBlock.text) : null;
    const proposte = validaProposte(parsed);

    if (!proposte) {
      return NextResponse.json({ error: "Risposta del modello non valida, riprova" }, { status: 502 });
    }
    return NextResponse.json({ proposte });
  } catch (err) {
    return NextResponse.json({ error: `Chiamata al modello fallita: ${err.message || "errore sconosciuto"}` }, { status: 502 });
  }
}

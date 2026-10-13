import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { MODELLO_QUALITA } from "@/lib/models";
import { updateState } from "@/lib/store";

export const dynamic = "force-dynamic";

// Parte SOLO quando l'utente preme il pulsante — mai al caricamento pagina.
// Riusa gli stessi dati aggregati della GET (passati dal client) invece di
// ricalcolarli qui, così i due endpoint restano allineati a una sola fonte.
export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Dati mancanti" }, { status: 400 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY non configurata in .env.local" }, { status: 400 });
  }

  const contesto = `
Completati questa settimana: ${JSON.stringify((body.completati || []).map((c) => c.titolo))}
Slittati (in ritardo): ${JSON.stringify((body.slittati || []).map((s) => ({ titolo: s.titolo, persona: s.persona })))}
Persone silenziose da un po': ${JSON.stringify(body.personeSilenziose || [])}
Abitudini della settimana (% di completamento): ${JSON.stringify(body.riepilogoAbitudini || [])}
Pasti della settimana: ${JSON.stringify(body.riepilogoPasti || {})}
`.trim();

  const system =
    "Sei l'assistente della dashboard personale dell'utente. Scrivi un breve riassunto della settimana (stile briefing, 4-6 frasi, in italiano, diretto e concreto) basato SOLO sui dati forniti: cosa è andato bene, cosa è rimasto indietro, chi merita un contatto, come sono andate abitudini e alimentazione, e 2-3 priorità concrete per la prossima settimana. Non inventare nulla che non sia nei dati.";

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: MODELLO_QUALITA,
      max_tokens: 1000,
      system,
      messages: [{ role: "user", content: contesto }],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    const testo = textBlock?.text?.trim() || "Non sono riuscito a generare un riassunto.";
    const generatoIl = new Date().toISOString();

    await updateState((s) => {
      if (!s.review) s.review = {};
      s.review.ultimoRiassunto = { testo, generatoIl };
      return s;
    });

    return NextResponse.json({ testo, generatoIl });
  } catch (err) {
    return NextResponse.json({ error: `Chiamata al modello fallita: ${err.message || "errore sconosciuto"}` }, { status: 502 });
  }
}

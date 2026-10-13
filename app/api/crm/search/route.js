import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { MODELLO_VELOCE } from "@/lib/models";
import { readState } from "@/lib/store";

export const dynamic = "force-dynamic";

function searchByText(query, items) {
  const q = query.toLowerCase();
  return items.filter(
    (i) =>
      i.titolo.toLowerCase().includes(q) ||
      (i.persona || "").toLowerCase().includes(q) ||
      (i.tag || []).some((t) => t.toLowerCase().includes(q))
  ).map((i) => i.id);
}

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const query = body?.query?.trim();
  if (!query) return NextResponse.json({ ids: [] });

  const state = await readState();
  const aperti = state.crm.filter((i) => !i.dataCompletamento);
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ ids: searchByText(query, aperti), via: "regole" });
  }

  try {
    const client = new Anthropic({ apiKey });
    const listaCompatta = aperti.map((i) => ({ id: i.id, titolo: i.titolo, fascia: i.fascia, persona: i.persona, tag: i.tag }));
    const response = await client.messages.create({
      model: MODELLO_VELOCE,
      max_tokens: 500,
      system:
        "Ricevi una domanda in italiano e un elenco di elementi di un CRM personale. Rispondi SOLO con un oggetto JSON {\"ids\": [...]} con gli identificativi degli elementi pertinenti, senza testo prima o dopo.",
      messages: [{ role: "user", content: `Domanda: ${query}\n\nElementi: ${JSON.stringify(listaCompatta)}` }],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    const start = textBlock.text.indexOf("{");
    const end = textBlock.text.lastIndexOf("}");
    const parsed = JSON.parse(textBlock.text.slice(start, end + 1));
    const idsValidi = new Set(aperti.map((i) => i.id));
    // Scarta gli identificativi che il modello si è inventato.
    const ids = (parsed.ids || []).filter((id) => idsValidi.has(id));
    return NextResponse.json({ ids, via: "modello" });
  } catch {
    return NextResponse.json({ ids: searchByText(query, aperti), via: "regole" });
  }
}

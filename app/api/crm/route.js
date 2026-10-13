import { NextResponse } from "next/server";
import { readState, updateState } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await readState();
  return NextResponse.json({ crm: state.crm, persone: state.persone });
}

// Crea un nuovo elemento manualmente dal CRM (non dalla cattura, che ha la sua rotta).
export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (!body?.titolo) {
    return NextResponse.json({ error: "Titolo mancante" }, { status: 400 });
  }
  const now = new Date().toISOString();
  let created;
  await updateState((state) => {
    const itemsInFascia = state.crm.filter((i) => i.fascia === (body.fascia || "oggi"));
    const posizioneMinima = itemsInFascia.reduce((min, i) => Math.min(min, i.posizione ?? 0), 0);
    created = {
      id: crypto.randomUUID(),
      titolo: body.titolo,
      nota: body.nota || "",
      fascia: body.fascia || "oggi",
      temperatura: body.temperatura || "tiepido",
      persona: body.persona || null,
      tag: body.tag || [],
      posizione: posizioneMinima - 1,
      dataCreazione: now,
      dataCompletamento: null,
    };
    state.crm.push(created);
    return state;
  });
  return NextResponse.json(created, { status: 201 });
}

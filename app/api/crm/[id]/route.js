import { NextResponse } from "next/server";
import { updateState } from "@/lib/store";

export const dynamic = "force-dynamic";

const CAMPI_MODIFICABILI = ["titolo", "nota", "fascia", "temperatura", "persona", "tag"];

export async function PATCH(request, { params }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Corpo mancante" }, { status: 400 });

  let updated = null;
  await updateState((state) => {
    const item = state.crm.find((i) => i.id === id);
    if (!item) return state;
    for (const campo of CAMPI_MODIFICABILI) {
      if (campo in body) item[campo] = body[campo];
    }
    if ("completato" in body) {
      item.dataCompletamento = body.completato ? new Date().toISOString() : null;
    }
    updated = item;
    return state;
  });

  if (!updated) return NextResponse.json({ error: "Elemento non trovato" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  await updateState((state) => {
    state.crm = state.crm.filter((i) => i.id !== id);
    return state;
  });
  return NextResponse.json({ ok: true });
}

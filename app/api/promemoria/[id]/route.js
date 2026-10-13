import { NextResponse } from "next/server";
import { updateState } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function PATCH(request, { params }) {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  let trovato = false;
  const state = await updateState((s) => {
    const p = (s.promemoria || []).find((x) => x.id === id);
    if (!p) return s;
    trovato = true;
    p.fatto = typeof body?.fatto === "boolean" ? body.fatto : !p.fatto;
    return s;
  });
  if (!trovato) return NextResponse.json({ error: "Promemoria non trovato" }, { status: 404 });
  return NextResponse.json({ promemoria: state.promemoria });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const state = await updateState((s) => {
    s.promemoria = (s.promemoria || []).filter((x) => x.id !== id);
    return s;
  });
  return NextResponse.json({ promemoria: state.promemoria });
}

import { NextResponse } from "next/server";
import { updateState } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function DELETE(request, { params }) {
  const { id } = await params;
  let trovata = false;
  const state = await updateState((s) => {
    const lista = s.salute?.allenamenti || [];
    const idx = lista.findIndex((v) => v.id === id);
    if (idx !== -1) {
      lista.splice(idx, 1);
      trovata = true;
    }
    return s;
  });
  if (!trovata) return NextResponse.json({ error: "Voce non trovata" }, { status: 404 });
  return NextResponse.json({ log: state.salute.allenamenti });
}

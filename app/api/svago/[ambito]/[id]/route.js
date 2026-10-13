import { NextResponse } from "next/server";
import { updateState } from "@/lib/store";
import { ambitoSvagoValido } from "@/lib/svago";

export const dynamic = "force-dynamic";

// PATCH: alterna fatto/non fatto. Nessun altro campo è modificabile da qui.
export async function PATCH(request, { params }) {
  const { ambito, id } = await params;
  if (!ambitoSvagoValido(ambito)) return NextResponse.json({ error: "Ambito non valido" }, { status: 404 });

  let trovata = false;
  const state = await updateState((s) => {
    const voce = (s.svago?.[ambito] || []).find((v) => v.id === id);
    if (voce) {
      voce.fatto = !voce.fatto;
      trovata = true;
    }
    return s;
  });
  if (!trovata) return NextResponse.json({ error: "Voce non trovata" }, { status: 404 });
  return NextResponse.json({ lista: state.svago[ambito] });
}

export async function DELETE(request, { params }) {
  const { ambito, id } = await params;
  if (!ambitoSvagoValido(ambito)) return NextResponse.json({ error: "Ambito non valido" }, { status: 404 });

  let trovata = false;
  const state = await updateState((s) => {
    const lista = s.svago?.[ambito] || [];
    const idx = lista.findIndex((v) => v.id === id);
    if (idx !== -1) {
      lista.splice(idx, 1);
      trovata = true;
    }
    return s;
  });
  if (!trovata) return NextResponse.json({ error: "Voce non trovata" }, { status: 404 });
  return NextResponse.json({ lista: state.svago[ambito] });
}

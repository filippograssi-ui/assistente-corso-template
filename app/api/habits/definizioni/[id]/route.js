import { NextResponse } from "next/server";
import { updateState } from "@/lib/store";
import { coloreValido } from "@/lib/color-palette";

export const dynamic = "force-dynamic";

// Cambia solo il colore di un'abitudine già esistente (scelto dalla stessa
// tavolozza del calendario). Un valore mancante/non valido riporta l'abitudine
// al colore automatico, rimuovendo la sovrascrittura manuale.
export async function PATCH(request, { params }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const colore = coloreValido(body?.colore);

  let trovata = false;
  let abitudini;
  const state = await updateState((s) => {
    const lista = s.profilo.abitudini || [];
    const habit = lista.find((h) => h.id === id);
    if (habit) {
      trovata = true;
      if (colore) habit.colore = colore;
      else delete habit.colore;
    }
    abitudini = lista;
    return s;
  });
  if (!trovata) return NextResponse.json({ error: "Abitudine non trovata" }, { status: 404 });
  return NextResponse.json({ abitudini: abitudini ?? state.profilo.abitudini });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  let trovata = false;
  const state = await updateState((s) => {
    const lista = s.profilo.abitudini || [];
    const idx = lista.findIndex((h) => h.id === id);
    if (idx !== -1) {
      lista.splice(idx, 1);
      trovata = true;
    }
    return s;
  });
  if (!trovata) return NextResponse.json({ error: "Abitudine non trovata" }, { status: 404 });
  return NextResponse.json({ abitudini: state.profilo.abitudini });
}

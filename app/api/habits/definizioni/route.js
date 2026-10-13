import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { updateState } from "@/lib/store";
import { coloreValido } from "@/lib/color-palette";

export const dynamic = "force-dynamic";

// Aggiunge una nuova abitudine al profilo — non tocca i log dei giorni passati.
// Gli anelli e la lista in HabitsCard si adattano da soli al nuovo numero di
// abitudini, qualunque esso sia.
export async function POST(request) {
  const body = await request.json().catch(() => null);
  const nome = typeof body?.nome === "string" ? body.nome.trim() : "";
  const tipo = body?.tipo === "contatore" ? "contatore" : "spunta";
  if (!nome) return NextResponse.json({ error: "Nome mancante" }, { status: 400 });

  const habit = { id: randomUUID(), nome, tipo };
  if (tipo === "contatore") {
    const obiettivo = Number(body?.obiettivo);
    habit.obiettivo = Number.isFinite(obiettivo) && obiettivo > 0 ? Math.round(obiettivo) : 1;
  }
  // Colore facoltativo scelto dalla tavolozza: se assente, HabitsCard assegna
  // in automatico un colore ciclico in base alla posizione.
  const colore = coloreValido(body?.colore);
  if (colore) habit.colore = colore;

  const state = await updateState((s) => {
    if (!Array.isArray(s.profilo.abitudini)) s.profilo.abitudini = [];
    s.profilo.abitudini.push(habit);
    return s;
  });
  return NextResponse.json({ abitudini: state.profilo.abitudini }, { status: 201 });
}

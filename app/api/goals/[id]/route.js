import { NextResponse } from "next/server";
import { updateState } from "@/lib/store";

export const dynamic = "force-dynamic";
const SEZIONI = ["settimana", "mese"];

function trovaVoce(state, id) {
  for (const sezione of SEZIONI) {
    const lista = state.obiettivi?.[sezione] || [];
    const voce = lista.find((v) => v.id === id);
    if (voce) return { sezione, voce };
  }
  return null;
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  let aggiornata = null;
  const state = await updateState((s) => {
    const trovato = trovaVoce(s, id);
    if (!trovato) return s;
    if (typeof body?.fatto === "boolean") trovato.voce.fatto = body.fatto;
    if (typeof body?.testo === "string" && body.testo.trim()) trovato.voce.testo = body.testo.trim();
    if (body?.progresso !== undefined) trovato.voce.progresso = body.progresso;
    aggiornata = trovato.voce;
    return s;
  });
  if (!aggiornata) return NextResponse.json({ error: "Obiettivo non trovato" }, { status: 404 });
  return NextResponse.json({ settimana: state.obiettivi.settimana, mese: state.obiettivi.mese });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  let trovata = false;
  const state = await updateState((s) => {
    for (const sezione of SEZIONI) {
      const lista = s.obiettivi?.[sezione] || [];
      const idx = lista.findIndex((v) => v.id === id);
      if (idx !== -1) {
        lista.splice(idx, 1);
        trovata = true;
      }
    }
    return s;
  });
  if (!trovata) return NextResponse.json({ error: "Obiettivo non trovato" }, { status: 404 });
  return NextResponse.json({ settimana: state.obiettivi.settimana, mese: state.obiettivi.mese });
}

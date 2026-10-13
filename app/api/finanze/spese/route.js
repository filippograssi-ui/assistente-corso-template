import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { readState, updateState } from "@/lib/store";
import { getTodayKey } from "@/lib/date";

export const dynamic = "force-dynamic";

export const CATEGORIE_SPESE = ["Casa", "Spesa", "Trasporti", "Scuola", "Salute", "Svago", "Ristoranti", "Viaggi", "Altro"];

function ordina(lista) {
  return lista.slice().sort((a, b) => (a.data < b.data ? 1 : a.data > b.data ? -1 : a.dataCreazione < b.dataCreazione ? 1 : -1));
}

// Una lista di spese essenziale: descrizione, importo, categoria, data.
// I totali (mese corrente, per categoria) li calcola la card.
export async function GET() {
  const state = await readState();
  return NextResponse.json({ spese: ordina(state.finanza?.spese || []), categorie: CATEGORIE_SPESE });
}

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const descrizione = typeof body?.descrizione === "string" ? body.descrizione.trim().slice(0, 200) : "";
  const importo = Number(String(body?.importo ?? "").replace(",", "."));
  const categoria = typeof body?.categoria === "string" && body.categoria.trim() ? body.categoria.trim().slice(0, 40) : "Altro";
  const data = typeof body?.data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.data) ? body.data : getTodayKey();
  if (!descrizione) return NextResponse.json({ error: "Descrizione mancante" }, { status: 400 });
  if (!Number.isFinite(importo) || importo <= 0) return NextResponse.json({ error: "Importo non valido" }, { status: 400 });

  const voce = { id: randomUUID(), descrizione, importo: Math.round(importo * 100) / 100, categoria, data, dataCreazione: new Date().toISOString() };
  const state = await updateState((s) => {
    if (!s.finanza) s.finanza = {};
    if (!Array.isArray(s.finanza.spese)) s.finanza.spese = [];
    s.finanza.spese.push(voce);
    return s;
  });
  return NextResponse.json({ spese: ordina(state.finanza.spese) }, { status: 201 });
}

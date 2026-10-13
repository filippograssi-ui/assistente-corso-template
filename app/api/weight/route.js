import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { readState, updateState } from "@/lib/store";
import { getTodayKey } from "@/lib/date";

export const dynamic = "force-dynamic";
const LIMITE = 120; // ~4 mesi se registrato ogni giorno, più che sufficiente per un grafico

export async function GET() {
  const state = await readState();
  const log = (state.salute?.pesoLog || []).slice().sort((a, b) => (a.data < b.data ? -1 : 1));
  return NextResponse.json({ log: log.slice(-LIMITE) });
}

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const kg = Number(body?.kg);
  if (!Number.isFinite(kg) || kg <= 0) return NextResponse.json({ error: "Peso non valido" }, { status: 400 });
  const nota = typeof body?.nota === "string" ? body.nota.trim() : "";

  const voce = { id: randomUUID(), data: getTodayKey(), kg, nota };
  const state = await updateState((s) => {
    if (!s.salute) s.salute = { pesoLog: [], allenamenti: [] };
    if (!Array.isArray(s.salute.pesoLog)) s.salute.pesoLog = [];
    // Un solo peso al giorno: se registri di nuovo oggi, sostituisce il precedente.
    s.salute.pesoLog = s.salute.pesoLog.filter((v) => v.data !== voce.data);
    s.salute.pesoLog.push(voce);
    return s;
  });
  return NextResponse.json({ log: state.salute.pesoLog.slice().sort((a, b) => (a.data < b.data ? -1 : 1)) }, { status: 201 });
}

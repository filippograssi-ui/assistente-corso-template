import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { readState, updateState } from "@/lib/store";
import { getTodayKey } from "@/lib/date";

export const dynamic = "force-dynamic";
const LIMITE = 60;

export async function GET() {
  const state = await readState();
  const log = (state.salute?.allenamenti || []).slice().sort((a, b) => (a.data < b.data ? 1 : -1)); // più recenti prima
  return NextResponse.json({ log: log.slice(0, LIMITE) });
}

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const tipo = (body?.tipo || "").trim();
  if (!tipo) return NextResponse.json({ error: "Tipo di allenamento mancante" }, { status: 400 });
  const durataMinuti = Number(body?.durataMinuti);
  const nota = typeof body?.nota === "string" ? body.nota.trim() : "";

  const voce = {
    id: randomUUID(),
    data: getTodayKey(),
    tipo,
    durataMinuti: Number.isFinite(durataMinuti) && durataMinuti > 0 ? Math.round(durataMinuti) : null,
    nota,
  };
  const state = await updateState((s) => {
    if (!s.salute) s.salute = { pesoLog: [], allenamenti: [] };
    if (!Array.isArray(s.salute.allenamenti)) s.salute.allenamenti = [];
    s.salute.allenamenti.push(voce);
    return s;
  });
  return NextResponse.json({ log: state.salute.allenamenti.slice().sort((a, b) => (a.data < b.data ? 1 : -1)) }, { status: 201 });
}

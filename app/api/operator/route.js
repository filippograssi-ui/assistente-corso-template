import { NextResponse } from "next/server";
import { readState, readDailyLogsRange, updateState } from "@/lib/store";
import { computeStreak } from "@/lib/habits";
import { getTimezone, getTodayKey, addDaysToKey } from "@/lib/date";

export const dynamic = "force-dynamic";

// computeStreak cammina all'indietro giorno per giorno finché trova un giorno
// senza abitudini completate: con lo stato su file bastava tenere tutto in
// memoria, ma qui vorrebbe dire una query per ogni singolo giorno. Si prende
// invece in un colpo solo una finestra ampia (oltre un anno: più che
// sufficiente per qualunque striscia realistica) e si passa quella — un
// giorno fuori da questa finestra viene trattato come "non completato", che
// in pratica interrompe comunque il conteggio molto prima.
const GIORNI_FINESTRA_STREAK = 400;

export async function GET() {
  const state = await readState();
  const oggi = getTodayKey();
  const inizio = addDaysToKey(oggi, -(GIORNI_FINESTRA_STREAK - 1));
  const logs = await readDailyLogsRange(inizio, oggi);
  const streak = computeStreak(logs, getTimezone());
  return NextResponse.json({
    nome: state.profilo.nome,
    ruolo: state.profilo.ruolo,
    citta: state.profilo.citta,
    focus: state.profilo.focus,
    streak,
  });
}

// Modifica del profilo (per ora solo il nome, dalla schermata Impostazioni).
export async function PATCH(request) {
  const body = await request.json().catch(() => null);
  const nome = typeof body?.nome === "string" ? body.nome.trim().slice(0, 60) : "";
  if (!nome) return NextResponse.json({ error: "Nome mancante" }, { status: 400 });
  const state = await updateState((s) => {
    s.profilo.nome = nome;
    return s;
  });
  return NextResponse.json({ nome: state.profilo.nome });
}

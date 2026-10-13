import { NextResponse } from "next/server";
import { readState, readDailyLog, updateDailyLog } from "@/lib/store";
import { getTodayKey } from "@/lib/date";
import { computeCompletion } from "@/lib/habits";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await readState();
  const oggi = getTodayKey();
  const log = (await readDailyLog(oggi)).abitudini || {};
  return NextResponse.json({
    abitudini: state.profilo.abitudini,
    log,
    completamento: computeCompletion(state.profilo.abitudini, log),
  });
}

// Un clic spunta, incrementa, o azzera un contatore pieno.
export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (!body?.habitId) return NextResponse.json({ error: "habitId mancante" }, { status: 400 });

  const oggi = getTodayKey();
  const state = await readState();
  const habits = state.profilo.abitudini;
  const habit = habits.find((h) => h.id === body.habitId);

  const logDiOggi = await updateDailyLog(oggi, (log) => {
    if (!habit) return log;

    if (habit.tipo === "spunta") {
      log.abitudini[habit.id] = !log.abitudini[habit.id];
    } else {
      const obiettivo = habit.obiettivo || 1;
      const corrente = log.abitudini[habit.id] || 0;
      log.abitudini[habit.id] = corrente >= obiettivo ? 0 : corrente + 1;
    }
    return log;
  });

  return NextResponse.json({
    log: logDiOggi.abitudini,
    completamento: computeCompletion(habits, logDiOggi.abitudini),
  });
}

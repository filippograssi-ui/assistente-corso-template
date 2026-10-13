import { NextResponse } from "next/server";
import { readDailyLogsRange } from "@/lib/store";
import { getTodayKey, addDaysToKey } from "@/lib/date";

export const dynamic = "force-dynamic";

const GIORNI = 30;

// Solo lettura e aggregazione: nessuna chiamata al modello, nessuna scrittura.
export async function GET() {
  const oggi = getTodayKey();
  const inizio = addDaysToKey(oggi, -(GIORNI - 1));
  const logs = await readDailyLogsRange(inizio, oggi);

  const giorni = Object.keys(logs)
    .sort()
    .reverse()
    .map((data) => {
      const pasti = logs[data].pasti || [];
      const calorie = pasti.reduce((s, p) => s + (Number(p.calorie) || 0), 0);
      const proteine = pasti.reduce((s, p) => s + (Number(p.proteine) || 0), 0);
      const carboidrati = pasti.reduce((s, p) => s + (Number(p.carboidrati) || 0), 0);
      const grassi = pasti.reduce((s, p) => s + (Number(p.grassi) || 0), 0);
      return { data, pasti, calorie, proteine, carboidrati, grassi, numPasti: pasti.length };
    })
    .filter((g) => g.numPasti > 0); // solo i giorni con almeno un pasto registrato

  const giorniConDati = giorni.length;
  const medie = giorniConDati
    ? {
        calorie: Math.round(giorni.reduce((s, g) => s + g.calorie, 0) / giorniConDati),
        proteine: Math.round(giorni.reduce((s, g) => s + g.proteine, 0) / giorniConDati),
        carboidrati: Math.round(giorni.reduce((s, g) => s + g.carboidrati, 0) / giorniConDati),
        grassi: Math.round(giorni.reduce((s, g) => s + g.grassi, 0) / giorniConDati),
      }
    : { calorie: 0, proteine: 0, carboidrati: 0, grassi: 0 };

  return NextResponse.json({ giorni, giorniConDati, medie });
}

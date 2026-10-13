import { NextResponse } from "next/server";
import { readState, readDailyLogsRange, updateState } from "@/lib/store";
import { getTodayKey, addDaysToKey, getTimezone } from "@/lib/date";
import { computeStreak } from "@/lib/habits";
import { generaRiassuntoSalute } from "@/lib/salute-riassunto";

export const dynamic = "force-dynamic";

// GET: solo l'ultimo riassunto salvato. POST: lo rigenera adesso.
export async function GET() {
  const state = await readState();
  return NextResponse.json({
    testo: state.salute?.riassunto?.testo || null,
    generatoIl: state.salute?.riassunto?.generatoIl || null,
  });
}

export async function POST() {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY non configurata in .env.local" }, { status: 400 });
  }
  const oggi = getTodayKey();
  const settimanaFa = addDaysToKey(oggi, -6);
  const inizioStreak = addDaysToKey(oggi, -399);
  const inizioPeso = addDaysToKey(oggi, -14);
  const [state, logs] = await Promise.all([readState(), readDailyLogsRange(inizioStreak, oggi)]);

  const pesoLog = (state.salute?.pesoLog || []).slice().sort((a, b) => (a.data < b.data ? -1 : 1));
  const pesoUltimo = pesoLog[pesoLog.length - 1] || null;
  const pesoPrecedente = pesoLog.filter((v) => v.data <= inizioPeso).slice(-1)[0] || null;
  const allenamenti = (state.salute?.allenamenti || []).filter((a) => a.data >= settimanaFa && a.data <= oggi);
  const giorniConPasti = Object.entries(logs)
    .filter(([data]) => data >= settimanaFa && data <= oggi)
    .map(([, log]) => log.pasti || [])
    .filter((pasti) => pasti.length > 0);
  const media = (campo) =>
    Math.round(giorniConPasti.reduce((s, pasti) => s + pasti.reduce((s2, p) => s2 + (Number(p[campo]) || 0), 0), 0) / giorniConPasti.length);

  const dati = {
    streakAbitudini: computeStreak(logs, getTimezone()),
    pesoUltimoKg: pesoUltimo?.kg ?? null,
    pesoDiDueSettimaneFaKg: pesoPrecedente?.kg ?? null,
    allenamentiUltimi7Giorni: allenamenti.map((a) => ({ data: a.data, tipo: a.tipo, minuti: a.durataMinuti, km: a.distanzaKm })),
    alimentazioneMediaUltimi7Giorni: giorniConPasti.length
      ? { giorniRegistrati: giorniConPasti.length, calorieMedie: media("calorie"), proteineMedie: media("proteine"), carboidratiMedi: media("carboidrati"), grassiMedi: media("grassi") }
      : null,
  };

  const testo = await generaRiassuntoSalute(dati);
  if (!testo) return NextResponse.json({ error: "Il modello non ha restituito un riassunto, riprova" }, { status: 502 });
  const generatoIl = new Date().toISOString();
  await updateState((s) => {
    if (!s.salute) s.salute = { pesoLog: [], allenamenti: [] };
    s.salute.riassunto = { testo, generatoIl };
    return s;
  });
  return NextResponse.json({ testo, generatoIl });
}

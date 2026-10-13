import { NextResponse } from "next/server";
import { readState, readDailyLogsRange } from "@/lib/store";
import { getTodayKey, addDaysToKey } from "@/lib/date";

export const dynamic = "force-dynamic";

const GIORNI_FINESTRA = 7;
const SOGLIA_SILENZIO_GIORNI = 10;

function giorniFa(dataIso) {
  if (!dataIso) return Infinity;
  const diffMs = Date.now() - new Date(dataIso).getTime();
  return diffMs / (1000 * 60 * 60 * 24);
}

// Sola lettura e aggregazione: nessuna chiamata al modello qui (parte solo dal
// POST su /api/review/summary, mai al caricamento pagina).
export async function GET() {
  const state = await readState();
  const oggi = getTodayKey();
  const inizioFinestra = addDaysToKey(oggi, -(GIORNI_FINESTRA - 1));
  const crm = state.crm || [];

  const completati = crm
    .filter((i) => i.dataCompletamento && giorniFa(i.dataCompletamento) <= GIORNI_FINESTRA)
    .sort((a, b) => new Date(b.dataCompletamento) - new Date(a.dataCompletamento));

  const slittati = crm
    .filter((i) => !i.dataCompletamento && i.fascia === "in-ritardo")
    .sort((a, b) => (a.posizione ?? 0) - (b.posizione ?? 0));

  const perPersona = new Map();
  for (const i of crm) {
    if (!i.persona || i.dataCompletamento) continue;
    const attuale = perPersona.get(i.persona);
    if (!attuale || i.dataCreazione < attuale.dataCreazione) perPersona.set(i.persona, i);
  }
  const personeSilenziose = Array.from(perPersona.entries())
    .map(([persona, item]) => ({ persona, giorni: Math.floor(giorniFa(item.dataCreazione)), titolo: item.titolo }))
    .filter((p) => p.giorni >= SOGLIA_SILENZIO_GIORNI)
    .sort((a, b) => b.giorni - a.giorni);

  const logs = await readDailyLogsRange(inizioFinestra, oggi);
  const abitudini = state.profilo?.abitudini || [];
  const riepilogoAbitudini = abitudini.map((h) => {
    const giorni = Object.values(logs);
    if (h.tipo === "spunta") {
      const fatti = giorni.filter((g) => g.abitudini?.[h.id]).length;
      return { nome: h.nome, percentuale: Math.round((fatti / GIORNI_FINESTRA) * 100) };
    }
    const obiettivo = h.obiettivo || 1;
    const medie = giorni.map((g) => Math.min(1, (g.abitudini?.[h.id] || 0) / obiettivo));
    const media = medie.reduce((s, v) => s + v, 0) / GIORNI_FINESTRA;
    return { nome: h.nome, percentuale: Math.round(media * 100) };
  });

  const giorniConPasti = Object.values(logs).filter((g) => (g.pasti || []).length > 0);
  const riepilogoPasti = {
    numeroPasti: giorniConPasti.reduce((s, g) => s + g.pasti.length, 0),
    giorniRegistrati: giorniConPasti.length,
    calorieMedie: giorniConPasti.length
      ? Math.round(giorniConPasti.reduce((s, g) => s + g.pasti.reduce((s2, p) => s2 + (Number(p.calorie) || 0), 0), 0) / giorniConPasti.length)
      : 0,
  };

  return NextResponse.json({
    completati,
    slittati,
    personeSilenziose,
    riepilogoAbitudini,
    riepilogoPasti,
    ultimoRiassunto: state.review?.ultimoRiassunto || null,
  });
}

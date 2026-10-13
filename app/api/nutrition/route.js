import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { MODELLO_VELOCE } from "@/lib/models";
import { readState, updateDailyLog, readDailyLog } from "@/lib/store";
import { getTodayKey } from "@/lib/date";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await readState();
  const log = await readDailyLog(getTodayKey());
  return NextResponse.json({
    pasti: log.pasti || [],
    obiettivoCalorico: state.profilo.obiettivoCalorico || 2000,
  });
}

async function stimaPasto(descrizione) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("[nutrition] ANTHROPIC_API_KEY assente in .env.local");
    return { calorie: 0, proteine: 0, carboidrati: 0, grassi: 0, nonStimato: true, erroreStima: "Chiave API mancante in .env.local" };
  }

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: MODELLO_VELOCE,
      max_tokens: 200,
      system:
        'Stimi i valori nutrizionali totali di un pasto descritto in italiano. La descrizione può essere un elenco di alimenti con quantità (es. "Pasta 80g, Pollo 150g, Olio 10g") oppure una frase libera: se sono indicate delle quantità, usale per una stima precisa; se un alimento non ha quantità, stima una porzione standard. ' +
        'Rispondi SOLO con JSON: {"calorie": numero, "proteine": grammi, "carboidrati": grammi, "grassi": grammi}. Nessun testo prima o dopo.',
      messages: [{ role: "user", content: descrizione }],
    });
    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock) throw new Error("risposta del modello senza testo");
    const start = textBlock.text.indexOf("{");
    const end = textBlock.text.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error(`risposta senza JSON: "${textBlock.text.slice(0, 120)}"`);
    const parsed = JSON.parse(textBlock.text.slice(start, end + 1));
    const calorie = Math.round(Number(parsed.calorie) || 0);
    const proteine = Math.round(Number(parsed.proteine) || 0);
    const carboidrati = Math.round(Number(parsed.carboidrati) || 0);
    const grassi = Math.round(Number(parsed.grassi) || 0);
    if (!calorie && !proteine && !carboidrati && !grassi) {
      throw new Error("risposta del modello con tutti i valori a zero");
    }
    return { calorie, proteine, carboidrati, grassi };
  } catch (err) {
    // Log sempre visibile nel Terminale dove gira "npm run dev" — senza questo,
    // una stima fallita non lasciava nessuna traccia del motivo reale.
    console.error("[nutrition] stima pasto fallita:", err?.status ? `HTTP ${err.status} — ` : "", err?.message || err);
    const dettaglio = err?.status
      ? `Errore API (HTTP ${err.status}): ${err?.error?.error?.message || err?.message || "sconosciuto"}`
      : err?.message || "errore sconosciuto";
    return { calorie: 0, proteine: 0, carboidrati: 0, grassi: 0, nonStimato: true, erroreStima: dettaglio };
  }
}

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const descrizione = body?.descrizione?.trim();
  if (!descrizione) return NextResponse.json({ error: "Descrizione mancante" }, { status: 400 });

  const stima = await stimaPasto(descrizione);
  const oggi = getTodayKey();
  let pasto;

  await updateDailyLog(oggi, (log) => {
    pasto = {
      id: crypto.randomUUID(),
      orario: new Date().toISOString(),
      nome: descrizione,
      calorie: stima.calorie,
      proteine: stima.proteine,
      carboidrati: stima.carboidrati,
      grassi: stima.grassi,
      stimato: true,
      nonStimato: Boolean(stima.nonStimato),
      erroreStima: stima.erroreStima || null,
    };
    log.pasti = [...(log.pasti || []), pasto];
    return log;
  });

  return NextResponse.json(pasto, { status: 201 });
}

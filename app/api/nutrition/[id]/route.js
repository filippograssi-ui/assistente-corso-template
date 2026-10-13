import { NextResponse } from "next/server";
import { updateDailyLog } from "@/lib/store";
import { getTodayKey } from "@/lib/date";

export const dynamic = "force-dynamic";

const CAMPI = ["nome", "calorie", "proteine", "carboidrati", "grassi", "stimato"];

export async function PATCH(request, { params }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Corpo mancante" }, { status: 400 });

  let updated = null;
  await updateDailyLog(getTodayKey(), (log) => {
    const pasto = (log.pasti || []).find((p) => p.id === id);
    if (!pasto) return log;
    for (const campo of CAMPI) {
      if (campo in body) pasto[campo] = body[campo];
    }
    updated = pasto;
    return log;
  });

  if (!updated) return NextResponse.json({ error: "Pasto non trovato" }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  await updateDailyLog(getTodayKey(), (log) => {
    log.pasti = (log.pasti || []).filter((p) => p.id !== id);
    return log;
  });
  return NextResponse.json({ ok: true });
}

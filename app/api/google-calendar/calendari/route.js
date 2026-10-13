import { NextResponse } from "next/server";
import { updateState } from "@/lib/store";
import { invalidaCache } from "@/lib/calendar-eventi";

export const dynamic = "force-dynamic";

// Salva quali calendari Google mostrare (id dei calendari scelti dall'utente).
export async function PUT(request) {
  const body = await request.json().catch(() => null);
  const ids = Array.isArray(body?.calendari) ? body.calendari.filter((id) => typeof id === "string" && id).slice(0, 30) : [];
  if (!ids.length) return NextResponse.json({ error: "Seleziona almeno un calendario" }, { status: 400 });
  const state = await updateState((s) => {
    if (!s.integrazioni) s.integrazioni = {};
    if (!s.integrazioni.googleCalendar) s.integrazioni.googleCalendar = {};
    s.integrazioni.googleCalendar.calendariSelezionati = ids;
    return s;
  });
  invalidaCache();
  return NextResponse.json({ selezionati: state.integrazioni.googleCalendar.calendariSelezionati });
}

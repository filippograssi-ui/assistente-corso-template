import { NextResponse } from "next/server";
import { eventiNellIntervallo } from "@/lib/calendar-eventi";

export const dynamic = "force-dynamic";
const NOSTORE = { "Cache-Control": "no-store" };

// Gli impegni dell'intervallo richiesto: Google Calendar (se collegato, tutti
// i calendari selezionati) + impegni salvati in locale nell'app.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const startParam = searchParams.get("start");
  const endParam = searchParams.get("end");

  const rangeStart = startParam ? new Date(`${startParam}T00:00:00`) : (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d; })();
  const rangeEnd = endParam ? new Date(`${endParam}T23:59:59`) : (() => { const d = new Date(); d.setDate(d.getDate() + 14); return d; })();

  const { connesso, events, error } = await eventiNellIntervallo(rangeStart, rangeEnd);
  return NextResponse.json({ configured: connesso, events, error }, { headers: NOSTORE });
}

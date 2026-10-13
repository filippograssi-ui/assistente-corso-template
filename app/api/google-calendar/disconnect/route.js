import { NextResponse } from "next/server";
import { updateState } from "@/lib/store";

export const dynamic = "force-dynamic";

// Scollega Google Calendar (dimentica i token). Gli eventi restano dove sono
// sempre stati — su Google — non c'è nessuna copia locale da perdere.
export async function DELETE() {
  await updateState((s) => {
    if (s.integrazioni) s.integrazioni.googleCalendar = null;
    return s;
  });
  return NextResponse.json({ ok: true });
}

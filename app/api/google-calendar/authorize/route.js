import { NextResponse } from "next/server";
import { configurato, costruisciUrlAutorizzazione } from "@/lib/google-calendar";

export const dynamic = "force-dynamic";

// Punto di partenza del collegamento: reindirizza a Google per l'autorizzazione.
// Il pulsante "Connetti Google Calendar" nella scheda Calendario punta qui.
export async function GET(request) {
  if (!configurato()) {
    return NextResponse.json(
      { error: "Google Calendar non configurato: manca GOOGLE_CALENDAR_CLIENT_ID/GOOGLE_CALENDAR_CLIENT_SECRET in .env.local" },
      { status: 400 }
    );
  }
  const redirectUri = `${new URL(request.url).origin}/api/google-calendar/callback`;
  return NextResponse.redirect(costruisciUrlAutorizzazione(redirectUri));
}

import { NextResponse } from "next/server";
import { scambiaCodice } from "@/lib/google-calendar";
import { updateState } from "@/lib/store";

export const dynamic = "force-dynamic";

// Google reindirizza qui dopo che Filippo autorizza (o nega) l'accesso.
// Si torna alla Home sulla scheda Calendario — il risultato (connesso o
// errore) si vede lì, non serve una pagina dedicata (stesso schema di Strava).
export async function GET(request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const errore = url.searchParams.get("error");
  const destinazione = new URL("/", url.origin);
  destinazione.searchParams.set("schermata", "home");

  if (errore) {
    destinazione.searchParams.set("googleCalendar", "negato");
    return NextResponse.redirect(destinazione);
  }
  if (!code) {
    destinazione.searchParams.set("googleCalendar", "errore");
    return NextResponse.redirect(destinazione);
  }

  const redirectUri = `${url.origin}/api/google-calendar/callback`;
  try {
    const risposta = await scambiaCodice(code, redirectUri);
    if (!risposta.refresh_token) {
      // Non dovrebbe succedere con prompt=consent, ma se capita non c'è modo
      // di rinnovare il token più avanti: meglio segnalarlo subito.
      destinazione.searchParams.set("googleCalendar", "errore");
      return NextResponse.redirect(destinazione);
    }
    await updateState((s) => {
      if (!s.integrazioni) s.integrazioni = {};
      s.integrazioni.googleCalendar = {
        accessToken: risposta.access_token,
        refreshToken: risposta.refresh_token,
        scadenza: Math.floor(Date.now() / 1000) + (risposta.expires_in || 3600),
      };
      return s;
    });
    destinazione.searchParams.set("googleCalendar", "connesso");
  } catch {
    destinazione.searchParams.set("googleCalendar", "errore");
  }
  return NextResponse.redirect(destinazione);
}

import { NextResponse } from "next/server";
import { readState } from "@/lib/store";
import { configurato, listaCalendari } from "@/lib/google-calendar";
import { accessTokenValido, calendariSelezionati } from "@/lib/calendar-eventi";

export const dynamic = "force-dynamic";

// Stato del collegamento + elenco dei calendari dell'account (principale e
// condivisi) con quelli attualmente selezionati, per la scelta nella card.
export async function GET() {
  const state = await readState();
  const google = state.integrazioni?.googleCalendar || null;
  const connesso = Boolean(google?.refreshToken);
  let calendari = [];
  if (connesso) {
    try {
      const token = await accessTokenValido(state);
      if (token) calendari = await listaCalendari(token);
    } catch {
      calendari = [];
    }
  }
  return NextResponse.json({
    configurato: configurato(),
    connesso,
    calendari,
    selezionati: calendariSelezionati(state),
  });
}

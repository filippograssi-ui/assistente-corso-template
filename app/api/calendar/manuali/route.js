import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { readState, updateState } from "@/lib/store";
import { categoriaEvento, coloreCategoria } from "@/lib/event-colors";
import { coloreValido } from "@/lib/color-palette";
import { getTimezone } from "@/lib/date";
import { configurato, creaEvento, eventoAGoogle, eventoDaGoogle } from "@/lib/google-calendar";
import { accessTokenValido, invalidaCache } from "@/lib/calendar-eventi";

export const dynamic = "force-dynamic";

// Crea un impegno per il giorno cliccato sul calendario. Se Google Calendar è
// collegato diventa un evento VERO sul calendario principale dell'account;
// altrimenti resta salvato in locale nell'app (state.calendario.eventiManuali)
// — così il calendario funziona da subito, anche senza nessun account esterno.
export async function POST(request) {
  const body = await request.json().catch(() => null);
  const summary = typeof body?.summary === "string" ? body.summary.trim() : "";
  const data = typeof body?.data === "string" ? body.data.trim() : "";
  const luogo = typeof body?.luogo === "string" ? body.luogo.trim().slice(0, 200) : "";
  if (!summary) return NextResponse.json({ error: "Titolo mancante" }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(data)) {
    return NextResponse.json({ error: "Data non valida" }, { status: 400 });
  }

  const coloreManualeScelto = coloreValido(body?.colore);
  const categoria = categoriaEvento(summary);
  const colore = coloreManualeScelto || coloreCategoria(categoria);
  const start = new Date(data).toISOString();

  const state = await readState();
  let accessToken = null;
  if (configurato()) {
    try {
      accessToken = await accessTokenValido(state);
    } catch (err) {
      return NextResponse.json({ error: `Rinnovo del collegamento Google fallito: ${err.message}` }, { status: 502 });
    }
  }

  if (accessToken) {
    try {
      const corpo = eventoAGoogle({ summary, start, luogo, colore, coloreManuale: Boolean(coloreManualeScelto) }, getTimezone());
      const creato = await creaEvento(accessToken, corpo);
      invalidaCache();
      const evento = eventoDaGoogle(creato, categoriaEvento, coloreCategoria);
      return NextResponse.json({ evento }, { status: 201 });
    } catch (err) {
      return NextResponse.json({ error: `Creazione evento fallita: ${err.message}` }, { status: 502 });
    }
  }

  const evento = {
    id: randomUUID(),
    summary,
    start,
    end: null,
    luogo: luogo || null,
    categoria,
    colore,
    coloreManuale: Boolean(coloreManualeScelto),
    fonte: "locale",
    dataCreazione: new Date().toISOString(),
  };
  await updateState((s) => {
    if (!s.calendario) s.calendario = { eventiManuali: [] };
    if (!Array.isArray(s.calendario.eventiManuali)) s.calendario.eventiManuali = [];
    s.calendario.eventiManuali.push(evento);
    return s;
  });
  return NextResponse.json({ evento: { ...evento, calendarioNome: "Nell'app" } }, { status: 201 });
}

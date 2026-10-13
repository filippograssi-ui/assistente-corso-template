import { NextResponse } from "next/server";
import { readState, updateState } from "@/lib/store";
import { categoriaEvento, coloreCategoria } from "@/lib/event-colors";
import { coloreValido } from "@/lib/color-palette";
import { getTimezone } from "@/lib/date";
import { configurato, aggiornaEvento, eliminaEvento, eventoAGoogle, eventoDaGoogle } from "@/lib/google-calendar";
import { accessTokenValido, invalidaCache } from "@/lib/calendar-eventi";

export const dynamic = "force-dynamic";

function trovaLocale(state, id) {
  return (state.calendario?.eventiManuali || []).find((e) => e.id === id) || null;
}

// Modifica un evento: se è un impegno locale lo aggiorna nell'app, altrimenti
// [id] è il vero id dell'evento su Google Calendar (anche uno aggiunto
// direttamente da Google si può correggere da qui).
export async function PATCH(request, { params }) {
  const { id } = await params;
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
  if (trovaLocale(state, id)) {
    let aggiornato = null;
    await updateState((s) => {
      const e = trovaLocale(s, id);
      if (e) {
        Object.assign(e, { summary, start, luogo: luogo || null, categoria, colore, coloreManuale: Boolean(coloreManualeScelto) });
        aggiornato = { ...e, calendarioNome: "Nell'app" };
      }
      return s;
    });
    return NextResponse.json({ evento: aggiornato });
  }

  if (!configurato()) return NextResponse.json({ error: "Evento non trovato" }, { status: 404 });
  let accessToken;
  try {
    accessToken = await accessTokenValido(state);
  } catch (err) {
    return NextResponse.json({ error: `Rinnovo del collegamento Google fallito: ${err.message}` }, { status: 502 });
  }
  if (!accessToken) return NextResponse.json({ error: "Google Calendar non è collegato" }, { status: 400 });

  try {
    const corpo = eventoAGoogle({ summary, start, luogo, colore, coloreManuale: Boolean(coloreManualeScelto) }, getTimezone());
    if (!luogo) corpo.location = ""; // svuota il luogo se tolto
    const aggiornato = await aggiornaEvento(accessToken, id, corpo);
    invalidaCache();
    return NextResponse.json({ evento: eventoDaGoogle(aggiornato, categoriaEvento, coloreCategoria) });
  } catch (err) {
    return NextResponse.json({ error: `Modifica evento fallita: ${err.message}` }, { status: 502 });
  }
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const state = await readState();
  if (trovaLocale(state, id)) {
    await updateState((s) => {
      s.calendario.eventiManuali = (s.calendario?.eventiManuali || []).filter((e) => e.id !== id);
      return s;
    });
    return NextResponse.json({ ok: true });
  }
  if (!configurato()) return NextResponse.json({ error: "Evento non trovato" }, { status: 404 });
  try {
    const accessToken = await accessTokenValido(state);
    if (!accessToken) return NextResponse.json({ error: "Google Calendar non è collegato" }, { status: 400 });
    await eliminaEvento(accessToken, id);
    invalidaCache();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: `Eliminazione fallita: ${err.message}` }, { status: 502 });
  }
}

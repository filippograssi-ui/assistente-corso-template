import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { readState, updateState } from "@/lib/store";
import { ambitoSvagoValido } from "@/lib/svago";

export const dynamic = "force-dynamic";

// Un'unica rotta generica per i tre ambiti di Svago (Viaggio, Watch list,
// Uscite con gli amici) invece di tre rotte quasi identiche: stessa struttura
// semplice di "To do scuola" (testo libero + casella di spunta), solo il
// segmento [ambito] cambia dove si legge/scrive dentro state.svago.
export async function GET(request, { params }) {
  const { ambito } = await params;
  if (!ambitoSvagoValido(ambito)) return NextResponse.json({ error: "Ambito non valido" }, { status: 404 });

  const state = await readState();
  const lista = (state.svago?.[ambito] || []).slice().sort((a, b) => (a.dataCreazione < b.dataCreazione ? 1 : -1));
  return NextResponse.json({ lista });
}

export async function POST(request, { params }) {
  const { ambito } = await params;
  if (!ambitoSvagoValido(ambito)) return NextResponse.json({ error: "Ambito non valido" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const testo = typeof body?.testo === "string" ? body.testo.trim() : "";
  if (!testo) return NextResponse.json({ error: "Testo mancante" }, { status: 400 });

  const voce = { id: randomUUID(), testo, fatto: false, dataCreazione: new Date().toISOString() };

  // Campi extra specifici per ambito (richiesta di Filippo): Watch list
  // chiede piattaforma/tipo/genere, Uscite con gli amici chiede il luogo
  // (usato anche per filtrare la lista) e un link facoltativo per prenotare.
  // Viaggio resta senza campi extra. Tutti facoltativi lato API: la
  // validazione su cosa è "richiesto" per l'utente vive lato form, qui si
  // accetta e si tronca solo per sicurezza.
  if (ambito === "watchlist") {
    voce.piattaforma = typeof body?.piattaforma === "string" ? body.piattaforma.trim().slice(0, 60) : "";
    voce.tipo = typeof body?.tipo === "string" ? body.tipo.trim().slice(0, 20) : "";
    voce.genere = typeof body?.genere === "string" ? body.genere.trim().slice(0, 60) : "";
  } else if (ambito === "posti") {
    voce.luogo = typeof body?.luogo === "string" ? body.luogo.trim().slice(0, 100) : "";
    voce.link = typeof body?.link === "string" ? body.link.trim().slice(0, 300) : "";
  } else if (ambito === "libri") {
    voce.autore = typeof body?.autore === "string" ? body.autore.trim().slice(0, 100) : "";
    voce.genere = typeof body?.genere === "string" ? body.genere.trim().slice(0, 60) : "";
  }

  const state = await updateState((s) => {
    if (!s.svago) s.svago = {};
    if (!Array.isArray(s.svago[ambito])) s.svago[ambito] = [];
    s.svago[ambito].push(voce);
    return s;
  });
  return NextResponse.json({ lista: state.svago[ambito] }, { status: 201 });
}

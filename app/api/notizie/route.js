import { NextResponse } from "next/server";
import { readState, updateState } from "@/lib/store";
import { generaNotizie } from "@/lib/rassegna";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// GET: argomenti scelti + ultima rassegna salvata. PUT: salva gli argomenti.
// POST: genera la rassegna adesso (ricerca web + modello).
export async function GET() {
  const state = await readState();
  return NextResponse.json({ argomenti: state.notizie?.argomenti || [], ultimo: state.notizie?.ultimo || null });
}

export async function PUT(request) {
  const body = await request.json().catch(() => null);
  const argomenti = Array.isArray(body?.argomenti)
    ? body.argomenti.filter((a) => typeof a === "string" && a.trim()).map((a) => a.trim().slice(0, 60)).slice(0, 12)
    : [];
  const state = await updateState((s) => {
    if (!s.notizie) s.notizie = { argomenti: [], ultimo: null };
    s.notizie.argomenti = argomenti;
    return s;
  });
  return NextResponse.json({ argomenti: state.notizie.argomenti });
}

export async function POST() {
  const state = await readState();
  const argomenti = state.notizie?.argomenti || [];
  if (!argomenti.length) return NextResponse.json({ error: "Scegli prima almeno un argomento" }, { status: 400 });
  const { testo, errore } = await generaNotizie(argomenti);
  if (!testo) return NextResponse.json({ error: errore }, { status: 400 });
  const ultimo = { testo, generatoIl: new Date().toISOString(), argomenti };
  await updateState((s) => {
    if (!s.notizie) s.notizie = { argomenti: [], ultimo: null };
    s.notizie.ultimo = ultimo;
    return s;
  });
  return NextResponse.json({ ultimo });
}

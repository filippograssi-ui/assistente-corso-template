import { NextResponse } from "next/server";
import { readState, updateState } from "@/lib/store";
import { generaTrendModa } from "@/lib/rassegna";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET() {
  const state = await readState();
  return NextResponse.json({ preferenze: state.moda?.preferenze || "", ultimo: state.moda?.ultimo || null });
}

export async function PUT(request) {
  const body = await request.json().catch(() => null);
  const preferenze = typeof body?.preferenze === "string" ? body.preferenze.trim().slice(0, 500) : "";
  await updateState((s) => {
    if (!s.moda) s.moda = { preferenze: "", ultimo: null };
    s.moda.preferenze = preferenze;
    return s;
  });
  return NextResponse.json({ preferenze });
}

export async function POST() {
  const state = await readState();
  const { testo, errore } = await generaTrendModa(state.moda?.preferenze || "");
  if (!testo) return NextResponse.json({ error: errore }, { status: 400 });
  const ultimo = { testo, generatoIl: new Date().toISOString() };
  await updateState((s) => {
    if (!s.moda) s.moda = { preferenze: "", ultimo: null };
    s.moda.ultimo = ultimo;
    return s;
  });
  return NextResponse.json({ ultimo });
}

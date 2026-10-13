import { NextResponse } from "next/server";
import { eseguiCattura } from "@/lib/capture";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const testo = body?.testo?.trim();

  if (!testo) {
    return NextResponse.json({ error: "Testo mancante" }, { status: 400 });
  }

  const risultato = await eseguiCattura(testo);
  return NextResponse.json({ destinazione: risultato.destinazione, via: risultato.via });
}

import { NextResponse } from "next/server";
import { readState, updateState } from "@/lib/store";
import { generaRiassuntoHome } from "@/lib/riassunto-home";

export const dynamic = "force-dynamic";

// GET: sola lettura dell'ultimo riassunto salvato (aprire la Home non chiama
// mai il modello). POST: lo rigenera adesso, su richiesta esplicita.
export async function GET() {
  const state = await readState();
  return NextResponse.json({
    testo: state.aggiornamenti?.testo || null,
    generatoIl: state.aggiornamenti?.generatoIl || null,
  });
}

export async function POST() {
  const { testo, errore } = await generaRiassuntoHome();
  if (!testo) return NextResponse.json({ error: errore }, { status: 400 });
  const generatoIl = new Date().toISOString();
  await updateState((s) => {
    s.aggiornamenti = { testo, generatoIl };
    return s;
  });
  return NextResponse.json({ testo, generatoIl });
}

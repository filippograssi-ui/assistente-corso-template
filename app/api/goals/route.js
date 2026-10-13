import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { readState, updateState } from "@/lib/store";

export const dynamic = "force-dynamic";

const SEZIONI = ["settimana", "mese"];

// Le due liste non si azzerano mai da sole: nessuna logica legata alla data,
// vengono lette e scritte così come sono state lasciate l'ultima volta.
export async function GET() {
  const state = await readState();
  return NextResponse.json({
    settimana: state.obiettivi?.settimana || [],
    mese: state.obiettivi?.mese || [],
  });
}

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const sezione = body?.sezione;
  const testo = (body?.testo || "").trim();
  if (!SEZIONI.includes(sezione)) return NextResponse.json({ error: "Sezione non valida" }, { status: 400 });
  if (!testo) return NextResponse.json({ error: "Testo mancante" }, { status: 400 });

  const voce = { id: randomUUID(), testo, fatto: false, progresso: null };
  const state = await updateState((s) => {
    if (!s.obiettivi) s.obiettivi = { settimana: [], mese: [] };
    if (!s.obiettivi[sezione]) s.obiettivi[sezione] = [];
    s.obiettivi[sezione].push(voce);
    return s;
  });
  return NextResponse.json({ settimana: state.obiettivi.settimana, mese: state.obiettivi.mese });
}

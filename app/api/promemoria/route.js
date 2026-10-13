import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { readState, updateState } from "@/lib/store";

export const dynamic = "force-dynamic";

function ordina(lista) {
  return lista.slice().sort((a, b) => {
    if (a.fatto !== b.fatto) return a.fatto ? 1 : -1;
    if (a.scadenza && b.scadenza) return a.scadenza < b.scadenza ? -1 : 1;
    if (a.scadenza) return -1;
    if (b.scadenza) return 1;
    return a.dataCreazione < b.dataCreazione ? -1 : 1;
  });
}

// Promemoria semplici, salvati nell'app (testo + data/ora facoltativa).
export async function GET() {
  const state = await readState();
  return NextResponse.json({ promemoria: ordina(state.promemoria || []) });
}

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const testo = typeof body?.testo === "string" ? body.testo.trim().slice(0, 300) : "";
  const scadenza = typeof body?.scadenza === "string" && /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(body.scadenza) ? body.scadenza : null;
  if (!testo) return NextResponse.json({ error: "Testo mancante" }, { status: 400 });
  const voce = { id: randomUUID(), testo, scadenza, fatto: false, dataCreazione: new Date().toISOString() };
  const state = await updateState((s) => {
    if (!Array.isArray(s.promemoria)) s.promemoria = [];
    s.promemoria.push(voce);
    return s;
  });
  return NextResponse.json({ promemoria: ordina(state.promemoria) }, { status: 201 });
}

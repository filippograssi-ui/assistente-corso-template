import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { readState, updateState } from "@/lib/store";

export const dynamic = "force-dynamic";

// Le classi del docente (es. "4A", "2B"): ognuna può avere il link al suo
// team/canale di Microsoft Teams, mostrato poi nell'agenda del giorno.
export async function GET() {
  const state = await readState();
  return NextResponse.json({ classi: state.scuola?.classi || [] });
}

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const nome = typeof body?.nome === "string" ? body.nome.trim().slice(0, 30) : "";
  const teams = typeof body?.teams === "string" ? body.teams.trim().slice(0, 500) : "";
  const note = typeof body?.note === "string" ? body.note.trim().slice(0, 200) : "";
  if (!nome) return NextResponse.json({ error: "Nome della classe mancante" }, { status: 400 });

  let errore = null;
  const state = await updateState((s) => {
    if (!s.scuola) s.scuola = {};
    if (!Array.isArray(s.scuola.classi)) s.scuola.classi = [];
    if (s.scuola.classi.some((c) => c.nome.toLowerCase() === nome.toLowerCase())) {
      errore = "Esiste già una classe con questo nome";
      return s;
    }
    s.scuola.classi.push({ id: randomUUID(), nome, teams, note, dataCreazione: new Date().toISOString() });
    return s;
  });
  if (errore) return NextResponse.json({ error: errore }, { status: 400 });
  return NextResponse.json({ classi: state.scuola.classi }, { status: 201 });
}

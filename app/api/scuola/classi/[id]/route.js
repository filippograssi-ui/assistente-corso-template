import { NextResponse } from "next/server";
import { updateState } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function PATCH(request, { params }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  let trovata = false;
  const state = await updateState((s) => {
    const c = (s.scuola?.classi || []).find((x) => x.id === id);
    if (!c) return s;
    trovata = true;
    const vecchioNome = c.nome;
    if (typeof body?.nome === "string" && body.nome.trim()) c.nome = body.nome.trim().slice(0, 30);
    if (typeof body?.teams === "string") c.teams = body.teams.trim().slice(0, 500);
    if (typeof body?.note === "string") c.note = body.note.trim().slice(0, 200);
    // Se il nome cambia, si aggiorna anche l'orario che lo usa come etichetta.
    if (c.nome !== vecchioNome && s.scuola?.orario?.griglia) {
      for (const giorno of Object.keys(s.scuola.orario.griglia)) {
        s.scuola.orario.griglia[giorno] = s.scuola.orario.griglia[giorno].map((v) => (v === vecchioNome ? c.nome : v));
      }
    }
    return s;
  });
  if (!trovata) return NextResponse.json({ error: "Classe non trovata" }, { status: 404 });
  return NextResponse.json({ classi: state.scuola.classi });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const state = await updateState((s) => {
    s.scuola.classi = (s.scuola?.classi || []).filter((c) => c.id !== id);
    return s;
  });
  return NextResponse.json({ classi: state.scuola.classi });
}

import { NextResponse } from "next/server";
import { readState, updateState } from "@/lib/store";
import { ambitoSvagoValido } from "@/lib/svago";

export const dynamic = "force-dynamic";

// Gusti scritti a mano da Filippo per un ambito Svago (es. "mi piace la
// montagna", "film thriller non troppo lunghi") — testo libero, usato dal
// suggeritore IA insieme a cosa è già in lista. Facoltativo: se vuoto, il
// suggeritore si basa solo sulla lista.
export async function GET(request, { params }) {
  const { ambito } = await params;
  if (!ambitoSvagoValido(ambito)) return NextResponse.json({ error: "Ambito non valido" }, { status: 404 });

  const state = await readState();
  return NextResponse.json({ preferenze: state.svago?.preferenze?.[ambito] || "" });
}

export async function PUT(request, { params }) {
  const { ambito } = await params;
  if (!ambitoSvagoValido(ambito)) return NextResponse.json({ error: "Ambito non valido" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const preferenze = typeof body?.preferenze === "string" ? body.preferenze.slice(0, 1000) : "";

  await updateState((s) => {
    if (!s.svago) s.svago = {};
    if (!s.svago.preferenze) s.svago.preferenze = {};
    s.svago.preferenze[ambito] = preferenze;
    return s;
  });

  return NextResponse.json({ preferenze });
}

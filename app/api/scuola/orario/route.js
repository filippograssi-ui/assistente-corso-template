import { NextResponse } from "next/server";
import { updateState } from "@/lib/store";
import { GIORNI_ORARIO } from "@/lib/scuola-agenda";

export const dynamic = "force-dynamic";

const GIORNI_CHIAVE = GIORNI_ORARIO.map((g) => g.chiave); // solo lun-ven
const ORE_DEFAULT = 6;

function orarioVuoto(ore = ORE_DEFAULT) {
  const griglia = {};
  for (const g of GIORNI_CHIAVE) griglia[g] = Array.from({ length: ore }, () => "");
  return { ore, griglia };
}

function normalizza(orario) {
  const ore = Number.isInteger(orario?.ore) && orario.ore > 0 && orario.ore <= 12 ? orario.ore : ORE_DEFAULT;
  const griglia = {};
  for (const g of GIORNI_CHIAVE) {
    const riga = Array.isArray(orario?.griglia?.[g]) ? orario.griglia[g] : [];
    griglia[g] = Array.from({ length: ore }, (_, i) => (typeof riga[i] === "string" ? riga[i] : ""));
  }
  return { ore, griglia };
}

// Orario settimanale del docente: in ogni cella c'è la CLASSE che ha quell'ora
// (non la materia) — è da qui che l'agenda del giorno ricava i suoi blocchi.
export async function GET() {
  let orario = null;
  await updateState((s) => {
    if (!s.scuola) s.scuola = {};
    s.scuola.orario = s.scuola.orario ? normalizza(s.scuola.orario) : orarioVuoto();
    orario = s.scuola.orario;
    return s;
  });
  return NextResponse.json({ orario });
}

// Sostituisce l'intero orario in un colpo solo (pulsante "Salva").
export async function POST(request) {
  const body = await request.json().catch(() => null);
  const ore = Number.isInteger(body?.ore) && body.ore > 0 && body.ore <= 12 ? body.ore : ORE_DEFAULT;
  const griglia = {};
  for (const g of GIORNI_CHIAVE) {
    const riga = Array.isArray(body?.griglia?.[g]) ? body.griglia[g] : [];
    griglia[g] = Array.from({ length: ore }, (_, i) => (typeof riga[i] === "string" ? riga[i].trim().slice(0, 30) : ""));
  }
  const orario = { ore, griglia };
  await updateState((s) => {
    if (!s.scuola) s.scuola = {};
    s.scuola.orario = orario;
    return s;
  });
  return NextResponse.json({ orario });
}

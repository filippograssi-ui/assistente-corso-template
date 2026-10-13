import { NextResponse } from "next/server";
import { updateState } from "@/lib/store";

export const dynamic = "force-dynamic";

// Riceve { fascia, orderedIds } e riscrive le posizioni di quella sola fascia.
export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (!body?.fascia || !Array.isArray(body.orderedIds)) {
    return NextResponse.json({ error: "Parametri mancanti" }, { status: 400 });
  }

  await updateState((state) => {
    body.orderedIds.forEach((id, index) => {
      const item = state.crm.find((i) => i.id === id);
      if (item) {
        item.fascia = body.fascia;
        item.posizione = index;
      }
    });
    return state;
  });

  return NextResponse.json({ ok: true });
}

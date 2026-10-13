import { NextResponse } from "next/server";
import { updateState } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function DELETE(request, { params }) {
  const { id } = await params;
  const state = await updateState((s) => {
    if (s.finanza) s.finanza.spese = (s.finanza.spese || []).filter((v) => v.id !== id);
    return s;
  });
  return NextResponse.json({ spese: state.finanza?.spese || [] });
}

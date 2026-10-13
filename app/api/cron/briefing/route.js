import { NextResponse } from "next/server";
import { eseguiBriefing } from "@/lib/briefing";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Chiamata da Vercel ogni mattina (vedi vercel.json) con l'intestazione
// Authorization: Bearer <CRON_SECRET>. La logica vera è in lib/briefing.js.
export async function GET(request) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
  return NextResponse.json(await eseguiBriefing());
}

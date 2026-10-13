import { NextResponse } from "next/server";
import { eseguiBriefing } from "@/lib/briefing";
import { whatsappConfigurato } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Pulsante "Manda ora il briefing" in Impostazioni: stessa cosa del cron del
// mattino, ma su richiesta (anche se oggi è già partito). Online è protetta
// dal cancello con password come tutta l'app.
export async function GET() {
  return NextResponse.json({ whatsapp: whatsappConfigurato(), cron: Boolean(process.env.CRON_SECRET) });
}

export async function POST() {
  const esito = await eseguiBriefing({ forza: true });
  return NextResponse.json(esito);
}

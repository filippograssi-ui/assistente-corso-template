import { NextResponse } from "next/server";
import { creaCookieSessione, confrontoSicuro, NOME_COOKIE_SESSIONE } from "@/lib/auth";

export const dynamic = "force-dynamic";

const TRENTA_GIORNI_SECONDI = 30 * 24 * 60 * 60;

// POST /api/auth/login — prompt A8: confronta con DASHBOARD_PASSWORD a
// tempo costante e, se combacia, apre la sessione con un cookie firmato.
export async function POST(request) {
  const dashboardPassword = process.env.DASHBOARD_PASSWORD;
  const authSecret = process.env.AUTH_SECRET;
  if (!dashboardPassword || !authSecret) {
    return NextResponse.json(
      { error: "Cancello non configurato: manca DASHBOARD_PASSWORD o AUTH_SECRET in .env.local" },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => null);
  const password = typeof body?.password === "string" ? body.password : "";

  if (!confrontoSicuro(password, dashboardPassword)) {
    return NextResponse.json({ error: "Password errata" }, { status: 401 });
  }

  const valoreCookie = await creaCookieSessione(authSecret);
  const risposta = NextResponse.json({ ok: true });
  risposta.cookies.set(NOME_COOKIE_SESSIONE, valoreCookie, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: TRENTA_GIORNI_SECONDI,
    path: "/",
  });
  return risposta;
}

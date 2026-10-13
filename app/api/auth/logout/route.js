import { NextResponse } from "next/server";
import { NOME_COOKIE_SESSIONE } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/auth/logout — cancella il cookie di sessione.
export async function POST() {
  const risposta = NextResponse.json({ ok: true });
  risposta.cookies.set(NOME_COOKIE_SESSIONE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return risposta;
}

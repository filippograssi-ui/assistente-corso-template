import { NextResponse } from "next/server";
import { readState, readAllDailyLogs } from "@/lib/store";
import { cookieSessioneValido, NOME_COOKIE_SESSIONE } from "@/lib/auth";
import { getTodayKey } from "@/lib/date";

export const dynamic = "force-dynamic";

// Bump manuale a ogni nuova migrazione applicata (supabase/migrazione-N.sql)
// — è solo un'informazione portata dentro il backup, non controlla nulla da
// sola: serve a te, in futuro, per sapere con quale forma delle tabelle è
// stato generato questo file.
const VERSIONE_SCHEMA = 4;

// Export completo di backup (prompt A19, Parte 7.6) — la via d'uscita da
// qualsiasi servizio: restituisce tutto il database in un unico JSON.
// Proprio perché restituisce tutto, accetta SOLO un cookie di sessione
// valido: la scorciatoia x-api-secret (valida per le altre rotte API, vedi
// middleware.js) qui non vale ed è rifiutata esplicitamente, indipendentemente
// da qualunque cosa arrivi anche nel cookie.
export async function GET(request) {
  if (request.headers.get("x-api-secret")) {
    return NextResponse.json({ error: "Non autorizzato: questa rotta non accetta x-api-secret" }, { status: 401 });
  }

  // Sul Percorso Locale (nessuna DASHBOARD_PASSWORD) non c'è un cancello e
  // quindi nessun cookie di sessione: il backup è sempre scaricabile.
  const cookie = request.cookies.get(NOME_COOKIE_SESSIONE)?.value;
  const cancelloAttivo = Boolean(process.env.DASHBOARD_PASSWORD);
  const valido = !cancelloAttivo || (await cookieSessioneValido(cookie, process.env.AUTH_SECRET));
  if (!valido) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const [state, logGiornalieri] = await Promise.all([readState(), readAllDailyLogs()]);

  const backup = {
    generatoIl: new Date().toISOString(),
    versioneSchema: VERSIONE_SCHEMA,
    stato: { ...state, logGiornalieri },
  };

  const nomeFile = `assistente-backup-${getTodayKey()}.json`;
  return new NextResponse(JSON.stringify(backup, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${nomeFile}"`,
      "Cache-Control": "no-store",
    },
  });
}

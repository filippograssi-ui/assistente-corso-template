import { NextResponse } from "next/server";
import { cookieSessioneValido, confrontoSicuro, NOME_COOKIE_SESSIONE } from "@/lib/auth";

// Il cancello del Percorso Completo (prompt A8 della guida PersonalOS).
//
// ATTIVO SOLO SE È GIÀ STATA SCELTA UNA DASHBOARD_PASSWORD: finché quella
// variabile non è impostata (siamo ancora sul Percorso Locale, o il
// Completo è in costruzione ma la password non è ancora stata scelta),
// questo middleware non fa assolutamente nulla — nessun redirect, nessun
// 401 — per non rompere l'uso quotidiano di Filippo sul suo Mac. Appena
// DASHBOARD_PASSWORD compare in .env.local (e si riavvia il server), il
// cancello si attiva da solo, senza bisogno di toccare questo file.
//
// Rotte escluse dal controllo password/cookie, e come si protegge ognuna:
//  - /login              è la pagina del modulo password: deve restare
//                         raggiungibile da chi non ha ancora fatto login,
//                         altrimenti nessuno potrebbe mai loggarsi.
//  - /api/auth/*         login e logout: lo stesso motivo di /login.
//                         /api/auth/login è l'unica rotta che confronta
//                         la password in chiaro (a tempo costante) e apre
//                         la sessione.
//  - /api/whatsapp/webhook  si protegge da sola: la GET di verifica
//                         controlla WHATSAPP_VERIFY_TOKEN nella query, la
//                         POST verifica la firma HMAC nell'intestazione
//                         x-hub-signature-256 (migrazione da Telegram) — un
//                         cookie di sessione non avrebbe senso per una
//                         chiamata che arriva da Meta.
//  - /api/cron/*          si protegge da sola verificando l'intestazione
//                         Authorization: Bearer con CRON_SECRET (prompt
//                         A18) — la piattaforma di hosting la manda da
//                         sola, non può portare un cookie di sessione.
const PREFISSI_ESCLUSI = ["/login", "/api/auth/", "/api/whatsapp/webhook", "/api/cron/"]; // whatsapp/cron: previsti per il Percorso Completo

function conNoIndex(response) {
  response.headers.set("X-Robots-Tag", "noindex");
  return response;
}

function rottaEsclusa(pathname) {
  return PREFISSI_ESCLUSI.some((prefisso) => pathname === prefisso || pathname.startsWith(prefisso));
}

export async function proxy(request) {
  const dashboardPassword = process.env.DASHBOARD_PASSWORD;
  if (!dashboardPassword) {
    // Cancello non ancora attivato: comportamento identico a prima, per non
    // rompere il Percorso Locale finché Filippo non sceglie una password.
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (rottaEsclusa(pathname)) {
    return conNoIndex(NextResponse.next());
  }

  // Le rotte API accettano anche il segreto x-api-secret al posto del
  // cookie, per l'accesso programmatico (scorciatoie del telefono, script) —
  // vedi Appendice B. ECCEZIONE: /api/admin/export (prompt A19) restituisce
  // tutto il database, quindi non vale questa scorciatoia — è la rotta
  // stessa a rifiutare esplicitamente x-api-secret, ma la si esclude anche
  // qui per non farla mai passare da questo ramo.
  if (pathname.startsWith("/api/") && pathname !== "/api/admin/export") {
    const apiSecret = process.env.API_SECRET;
    const segretoRicevuto = request.headers.get("x-api-secret");
    if (apiSecret && segretoRicevuto && confrontoSicuro(segretoRicevuto, apiSecret)) {
      return conNoIndex(NextResponse.next());
    }
  }

  const cookie = request.cookies.get(NOME_COOKIE_SESSIONE)?.value;
  const authSecret = process.env.AUTH_SECRET;
  if (await cookieSessioneValido(cookie, authSecret)) {
    return conNoIndex(NextResponse.next());
  }

  if (pathname.startsWith("/api/")) {
    return conNoIndex(NextResponse.json({ error: "Non autorizzato" }, { status: 401 }));
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  return conNoIndex(NextResponse.redirect(url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

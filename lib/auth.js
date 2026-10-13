// Il cancello del Percorso Completo (Parte 3 / prompt A8 della guida PersonalOS).
// Funzioni condivise tra middleware.js (gira in ambiente Edge) e le rotte
// app/api/auth/* (girano in Node): per questo usiamo solo Web Crypto
// (crypto.subtle/TextEncoder), disponibile in entrambi gli ambienti, invece
// del modulo "crypto" di Node — nessuna nuova dipendenza npm, stesso spirito
// già usato per lib/serpapi.js e lib/maps.js.

const encoder = new TextEncoder();
const TRENTA_GIORNI_MS = 30 * 24 * 60 * 60 * 1000;

function bufferAEsadecimale(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function chiaveHmac(segreto) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(segreto),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

async function firma(testo, segreto) {
  const chiave = await chiaveHmac(segreto);
  const firmaBuffer = await crypto.subtle.sign("HMAC", chiave, encoder.encode(testo));
  return bufferAEsadecimale(firmaBuffer);
}

// Confronto a tempo costante: non esce prima solo perché una lettera non
// combacia, altrimenti il tempo di risposta stesso rivela quanto è vicino un
// tentativo alla password/segreto giusti. Funziona sia su password in chiaro
// sia su firme esadecimali — non serve crypto.timingSafeEqual di Node
// (che tra l'altro non esiste in ambiente Edge, dove gira anche questo file).
export function confrontoSicuro(a, b) {
  const bufA = encoder.encode(a || "");
  const bufB = encoder.encode(b || "");
  const lunghezza = Math.max(bufA.length, bufB.length, 32);
  let diff = bufA.length === bufB.length ? 0 : 1;
  for (let i = 0; i < lunghezza; i++) {
    diff |= (bufA[i] || 0) ^ (bufB[i] || 0);
  }
  return diff === 0;
}

// Cookie di sessione: "<momento della firma>.<firma HMAC di quel momento>".
// Non contiene nessun dato personale, solo la prova che AUTH_SECRET l'ha
// firmato lui — fabbricarne uno valido senza conoscere AUTH_SECRET non è
// fattibile. Scade da solo dopo 30 giorni, controllato in verifica.
export async function creaCookieSessione(authSecret) {
  const emesso = Date.now().toString();
  const firmaValore = await firma(emesso, authSecret);
  return `${emesso}.${firmaValore}`;
}

export async function cookieSessioneValido(valoreCookie, authSecret) {
  if (!valoreCookie || !authSecret) return false;
  const punto = valoreCookie.indexOf(".");
  if (punto === -1) return false;
  const emesso = valoreCookie.slice(0, punto);
  const firmaRicevuta = valoreCookie.slice(punto + 1);
  const eta = Date.now() - Number(emesso);
  if (!Number.isFinite(eta) || eta < 0 || eta > TRENTA_GIORNI_MS) return false;
  const firmaAttesa = await firma(emesso, authSecret);
  return confrontoSicuro(firmaRicevuta, firmaAttesa);
}

export const NOME_COOKIE_SESSIONE = "sessione";

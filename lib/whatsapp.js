// Chiamate minime alla WhatsApp Cloud API di Meta (Lezione 4), usate dal
// webhook (messaggi in arrivo) e dal cron del briefing del mattino.
//
// Usa crypto.subtle (Web Crypto) invece del modulo "crypto" di Node per la
// verifica della firma del webhook — stesso motivo già scelto in lib/auth.js:
// funziona identico sia in ambiente Node sia Edge, nessuna nuova dipendenza.
import { confrontoSicuro } from "./auth.js";

// Versione dell'API Graph di Meta: non è urgente tenerla aggiornata (ogni
// versione resta supportata un paio d'anni), ma se in futuro le chiamate
// iniziano a fallire con un errore "versione non più supportata" è da qui
// che si aggiorna.
const VERSIONE_API = "v26.0";

const encoder = new TextEncoder();

function base() {
  return `https://graph.facebook.com/${VERSIONE_API}/${process.env.WHATSAPP_PHONE_NUMBER_ID}`;
}

function token() {
  const t = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!t) throw new Error("WhatsApp non configurato: manca WHATSAPP_ACCESS_TOKEN in .env.local");
  return t;
}

export function whatsappConfigurato() {
  return Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN &&
      process.env.WHATSAPP_PHONE_NUMBER_ID &&
      process.env.WHATSAPP_VERIFY_TOKEN &&
      process.env.WHATSAPP_USER_NUMBER
  );
}

async function chiamaWhatsApp(corpo) {
  const risposta = await fetch(`${base()}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
    body: JSON.stringify({ messaging_product: "whatsapp", ...corpo }),
  });
  const dati = await risposta.json().catch(() => null);
  if (!risposta.ok) {
    throw new Error(`WhatsApp (messages): ${dati?.error?.message || risposta.statusText}`);
  }
  return dati;
}

// Messaggio di testo libero: funziona solo entro le 24 ore dall'ultimo
// messaggio ricevuto da quel numero (la "finestra di assistenza clienti" di
// WhatsApp). Per il messaggio automatico del mattino, che parte senza che
// l'utente abbia scritto nulla prima, serve invece inviaTemplate qui sotto.
export async function inviaMessaggio(numero, testo) {
  return chiamaWhatsApp({ to: numero, type: "text", text: { body: testo } });
}

// Messaggio con pulsanti di risposta rapida (fino a 3), usato per correggere
// l'urgenza di una cattura. bottoni: [{ id, titolo }] — titolo max 20
// caratteri lato WhatsApp (limite imposto da Meta, non nostro).
export async function inviaBottoni(numero, testo, bottoni) {
  return chiamaWhatsApp({
    to: numero,
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: testo },
      action: { buttons: bottoni.map((b) => ({ type: "reply", reply: { id: b.id, title: b.titolo } })) },
    },
  });
}

// Messaggio da un modello approvato — l'unico modo per iniziare una
// conversazione WhatsApp senza che l'utente abbia scritto per primo (il
// briefing automatico del cron, fuori dalla finestra delle 24 ore).
// parametriCorpo: array di stringhe, nello stesso ordine dei segnaposto
// {{1}}, {{2}}... del modello approvato su Meta Business Manager.
export async function inviaTemplate(numero, nomeTemplate, parametriCorpo = [], lingua = "it") {
  return chiamaWhatsApp({
    to: numero,
    type: "template",
    template: {
      name: nomeTemplate,
      language: { code: lingua },
      components: parametriCorpo.length
        ? [{ type: "body", parameters: parametriCorpo.map((testo) => ({ type: "text", text: testo })) }]
        : [],
    },
  });
}

// Scarica un file media (es. un vocale) da WhatsApp: prima si chiede l'URL
// firmato tramite l'id del media, poi si scarica da lì — entrambe le
// chiamate vogliono lo stesso token nell'intestazione Authorization (a
// differenza di Telegram, che usa un dominio pubblico senza autenticazione).
export async function scaricaFile(mediaId) {
  const rispostaInfo = await fetch(`https://graph.facebook.com/${VERSIONE_API}/${mediaId}`, {
    headers: { Authorization: `Bearer ${token()}` },
  });
  const info = await rispostaInfo.json().catch(() => null);
  if (!rispostaInfo.ok || !info?.url) {
    throw new Error(`WhatsApp (info media): ${info?.error?.message || rispostaInfo.statusText}`);
  }
  const rispostaFile = await fetch(info.url, { headers: { Authorization: `Bearer ${token()}` } });
  if (!rispostaFile.ok) throw new Error(`Download media WhatsApp fallito: ${rispostaFile.status}`);
  return { buffer: Buffer.from(await rispostaFile.arrayBuffer()), mimeType: info.mime_type };
}

// Verifica la firma HMAC-SHA256 che Meta manda in ogni chiamata al webhook
// (intestazione x-hub-signature-256): senza questo controllo l'indirizzo
// sarebbe una porta aperta. La firma copre il corpo della richiesta e va
// calcolata sul testo GREZZO, prima di fare JSON.parse — per questo il webhook deve
// leggere il body con request.text() e non con request.json().
export async function firmaValida(corpoGrezzo, intestazioneFirma) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret || !intestazioneFirma) return false;
  const chiave = await crypto.subtle.importKey("raw", encoder.encode(appSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const firmaBuffer = await crypto.subtle.sign("HMAC", chiave, encoder.encode(corpoGrezzo));
  const firmaEsadecimale = Array.from(new Uint8Array(firmaBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return confrontoSicuro(`sha256=${firmaEsadecimale}`, intestazioneFirma);
}

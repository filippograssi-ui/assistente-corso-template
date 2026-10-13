import Anthropic from "@anthropic-ai/sdk";
import { MODELLO_QUALITA } from "./models.js";
import { readState, updateState } from "./store.js";
import { getTodayKey } from "./date.js";
import { raccogliDatiHome, generaRiassuntoHome } from "./riassunto-home.js";
import { inviaTemplate, whatsappConfigurato } from "./whatsapp.js";

// Il briefing del mattino (Lezione 4): ogni giorno genera il riassunto della
// Home e lo manda su WhatsApp con un modello di messaggio approvato da Meta
// (inviaTemplate: è l'unico modo per iniziare una conversazione senza che
// l'utente abbia scritto prima). Dichiarato in vercel.json: "0 5 * * *" è
// in UTC — le 6 in Italia d'inverno, le 7 d'estate.
//
// Prova a mano, dal tuo computer o dal browser con un'estensione:
//   curl -H "Authorization: Bearer IL_TUO_CRON_SECRET" https://tuo-sito.vercel.app/api/cron/briefing

const SYSTEM_MESSAGGIO = `Scrivi il messaggio WhatsApp del mattino per l'assistente personale di un docente, in
italiano. Un testo discorsivo, in prosa naturale (NON un elenco, NON frasi telegrafiche, NON emoji a inizio
frase), in UN UNICO blocco senza mai andare a capo. Copri solo le parti con dati rilevanti: come si
presenta la giornata, gli impegni di oggi e domani, le classi e le ore di oggi con gli appunti e le cose
da fare segnate per quelle lezioni, cose da fare e promemoria aperti, obiettivi della settimana, salute
solo se c'è qualcosa di significativo. Indicativamente 8-12 frasi. Tono diretto e colloquiale, mai
entusiasta, niente punti esclamativi. Nessun saluto, nessuna firma: solo il testo.`;

// WhatsApp rifiuta i parametri di un modello con a capo, tab o più di 4
// spazi consecutivi: si pulisce sempre il testo prima di mandarlo.
function pulisciParametro(testo) {
  return (testo || "").replace(/[\r\n\t]+/g, " ").replace(/ {2,}/g, " ").trim().slice(0, 1400);
}

// forza=true (pulsante in Impostazioni) manda il briefing anche se oggi è
// già partito — utile per provarlo dal vivo.
export async function eseguiBriefing({ forza = false } = {}) {
  const oggi = getTodayKey();
  const state = await readState();

  // Idempotente: se il briefing di oggi è già partito, non si rimanda.
  const ultimo = (state.registro || []).filter((r) => r.evento === "briefing").slice(-1)[0];
  if (!forza && ultimo && String(ultimo.data).slice(0, 10) === oggi) {
    return { ok: true, riepilogo: "Briefing di oggi già inviato, nessuna azione." };
  }

  // 1) Riassunto della Home (lo stesso del pulsante "Genera").
  const { testo: riassuntoHome } = await generaRiassuntoHome();
  if (riassuntoHome) {
    await updateState((s) => {
      s.aggiornamenti = { testo: riassuntoHome, generatoIl: new Date().toISOString() };
      return s;
    });
  }

  // 2) Messaggio WhatsApp, su una riga sola.
  let messaggio = null;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey && whatsappConfigurato()) {
    try {
      const client = new Anthropic({ apiKey });
      const dati = await raccogliDatiHome();
      const risposta = await client.messages.create({
        model: MODELLO_QUALITA,
        max_tokens: 800,
        system: SYSTEM_MESSAGGIO,
        messages: [{ role: "user", content: JSON.stringify(dati) }],
      });
      const blocco = risposta.content.find((b) => b.type === "text");
      messaggio = pulisciParametro(blocco?.text) || null;
    } catch {
      messaggio = null;
    }
  }

  let nota = "WhatsApp non configurato: niente inviato.";
  if (messaggio) {
    try {
      const nomeTemplate = process.env.WHATSAPP_TEMPLATE_BRIEFING || "briefing_giornaliero";
      await inviaTemplate(process.env.WHATSAPP_USER_NUMBER, nomeTemplate, [messaggio]);
      nota = "Briefing inviato su WhatsApp.";
    } catch (err) {
      nota = `Riassunto generato ma non inviato su WhatsApp: ${err.message}`;
    }
  } else if (!apiKey) {
    nota = "ANTHROPIC_API_KEY mancante: nessun riassunto generato.";
  }

  await updateState((s) => {
    if (!Array.isArray(s.registro)) s.registro = [];
    s.registro.push({ evento: "briefing", data: new Date().toISOString() });
    return s;
  });

  return { ok: true, riepilogo: `${nota} Riassunto Home: ${riassuntoHome ? "generato" : "non generato"}.` };
}

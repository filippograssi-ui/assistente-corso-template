import { NextResponse } from "next/server";
import { eseguiCattura, correggiUrgenza } from "@/lib/capture";
import { inviaMessaggio, inviaBottoni, firmaValida } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

// Webhook WhatsApp Cloud API (Lezione 4): ogni messaggio che scrivi al numero
// dell'assistente passa da qui e finisce nella sezione giusta, come dalla
// barra di cattura. L'indirizzo e il token di verifica si registrano sul
// pannello Meta for Developers DOPO la pubblicazione online — in locale non
// arriva niente, Meta vuole un indirizzo pubblico.
const ETICHETTA_URGENZA = { oggi: "Oggi", settimana: "Questa settimana", "più avanti": "Più avanti" };
const CODICE_URGENZA = { oggi: "o", settimana: "s", "più avanti": "p" };
const URGENZA_DA_CODICE = { o: "oggi", s: "settimana", p: "più avanti" };

function bottoniCorrezione(catturaId) {
  return Object.keys(ETICHETTA_URGENZA).map((urgenza) => ({
    id: `u:${catturaId}:${CODICE_URGENZA[urgenza]}`,
    titolo: ETICHETTA_URGENZA[urgenza],
  }));
}

// Confronta due numeri ignorando "+" e spazi.
function stessoNumero(a, b) {
  const pulisci = (n) => String(n || "").replace(/[^0-9]/g, "");
  return Boolean(a) && Boolean(b) && pulisci(a) === pulisci(b);
}

// Handshake di verifica di Meta (Callback URL + token di verifica).
export async function GET(request) {
  const url = new URL(request.url);
  const modo = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const sfida = url.searchParams.get("hub.challenge");
  if (modo === "subscribe" && token && process.env.WHATSAPP_VERIFY_TOKEN && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(sfida, { status: 200 });
  }
  return NextResponse.json({ error: "Verifica fallita" }, { status: 403 });
}

export async function POST(request) {
  // La firma di Meta copre il corpo GREZZO: va letto come testo prima del parse.
  const corpoGrezzo = await request.text();
  const firma = request.headers.get("x-hub-signature-256");
  if (!(await firmaValida(corpoGrezzo, firma))) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const payload = JSON.parse(corpoGrezzo || "{}");
  const valore = payload?.entry?.[0]?.changes?.[0]?.value;
  const messaggio = valore?.messages?.[0];
  // Le notifiche di stato (consegnato, letto) arrivano sullo stesso indirizzo: si ignorano.
  if (!messaggio) return NextResponse.json({ ok: true });

  // Si accettano solo i messaggi dal proprio numero.
  if (!stessoNumero(messaggio.from, process.env.WHATSAPP_USER_NUMBER)) {
    return NextResponse.json({ ok: true });
  }
  const numero = messaggio.from;

  if (messaggio.type === "interactive" && messaggio.interactive?.type === "button_reply") {
    const match = /^u:(.+):([osp])$/.exec(messaggio.interactive.button_reply.id || "");
    if (!match) return NextResponse.json({ ok: true });
    const [, catturaId, codice] = match;
    const nuovaUrgenza = URGENZA_DA_CODICE[codice];
    try {
      const trovata = await correggiUrgenza(catturaId, nuovaUrgenza);
      await inviaMessaggio(numero, trovata ? `Urgenza aggiornata: ${ETICHETTA_URGENZA[nuovaUrgenza]}.` : "Non trovata (forse già cancellata).").catch(() => {});
    } catch {
      await inviaMessaggio(numero, "Errore, riprova.").catch(() => {});
    }
    return NextResponse.json({ ok: true });
  }

  const testo = messaggio.text?.body?.trim() || "";
  if (!testo) {
    if (messaggio.type === "audio") {
      await inviaMessaggio(numero, "Per ora capisco solo i messaggi di testo: scrivimelo.").catch(() => {});
    }
    return NextResponse.json({ ok: true });
  }

  try {
    const risultato = await eseguiCattura(testo);
    await inviaMessaggio(numero, `Salvato in "${risultato.destinazione}" — urgenza: ${ETICHETTA_URGENZA[risultato.urgenza] || risultato.urgenza}.\n"${testo}"`);
    await inviaBottoni(numero, "Cambia urgenza:", bottoniCorrezione(risultato.catturaId));
  } catch (err) {
    await inviaMessaggio(numero, `Non sono riuscito a salvare (${err.message}).`).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}

// Pipeline di cattura condivisa (estratta da app/api/capture/route.js): la usano
// la barra di cattura della dashboard (e, in futuro, il webhook WhatsApp),
// così è garantito che un messaggio da Telegram finisca esattamente dove
// finirebbe scrivendolo nella barra — stessa classificazione, stessa scrittura
// di stato, stesso embedding di memoria.
import { classify, DESTINAZIONI } from "./classify.js";
import { updateState } from "./store.js";
import { categoriaEvento, coloreCategoria } from "./event-colors.js";
import { getTodayKey } from "./date.js";

export const FASCIA_DA_URGENZA = {
  oggi: "oggi",
  settimana: "settimana",
  "più avanti": "piu-avanti",
};

// Riusa sempre lo stesso id (catturaId) per la cattura e per l'eventuale voce
// derivata (evento calendario o task CRM) — sono alternative, mai entrambe per
// la stessa cattura, perché "destinazione" è un valore solo — così un secondo
// tocco (i pulsanti di correzione urgenza di Telegram) sa esattamente quale
// riga aggiornare, vedi correggiUrgenza qui sotto.
export async function eseguiCattura(testo) {
  const risultato = await classify(testo);
  // Difesa in profondità: anche se classify() dovesse restituire qualcosa di
  // strano, non scriviamo mai una destinazione fuori dall'elenco canonico.
  const destinazione = DESTINAZIONI.includes(risultato.destinazione) ? risultato.destinazione : "task";

  const now = new Date().toISOString();
  const catturaId = crypto.randomUUID();
  const memoriaId = crypto.randomUUID();
  const testoMemoria = risultato.titolo || testo;

  await updateState((state) => {
    state.catture.push({
      id: catturaId,
      testo,
      destinazione,
      via: risultato.via,
      urgenza: risultato.urgenza,
      persona: risultato.persona,
      dataCreazione: now,
    });

    state.memoria.push({
      id: memoriaId,
      testo: testoMemoria,
      provenienza: "cattura",
      dataCreazione: now,
    });

    // "calendario" crea un evento locale (non tocca il feed di Google, che è in
    // sola lettura): stessa colorazione per parola chiave del calendario della Home,
    // così "assegnare i colori" resta un'unica logica in tutta l'app.
    if (destinazione === "calendario") {
      const titolo = risultato.titolo || testo;
      const data = risultato.data || `${getTodayKey()}T09:00`;
      const inizio = data.includes("T") ? data : `${data}T09:00`;
      const categoria = categoriaEvento(titolo);
      if (!state.calendario) state.calendario = { eventiManuali: [] };
      if (!Array.isArray(state.calendario.eventiManuali)) state.calendario.eventiManuali = [];
      state.calendario.eventiManuali.push({
        id: catturaId,
        summary: titolo,
        start: new Date(inizio).toISOString(),
        categoria,
        colore: coloreCategoria(categoria),
        dataCreazione: now,
      });
    }

    // Le destinazioni con una scheda dedicata già costruita aggiornano anche quella.
    // Le altre (finanze, nutrizione, salute, obiettivi) hanno una loro logica di
    // scrittura più ricca, aggiunta insieme alla scheda corrispondente.
    if (destinazione === "task" || destinazione === "persone") {
      const fascia = FASCIA_DA_URGENZA[risultato.urgenza] || "oggi";
      const itemsInFascia = state.crm.filter((item) => item.fascia === fascia);
      const posizioneMinima = itemsInFascia.reduce((min, item) => Math.min(min, item.posizione ?? 0), 0);

      state.crm.push({
        id: catturaId,
        titolo: risultato.titolo || testo,
        nota: "",
        fascia,
        temperatura: "tiepido",
        persona: risultato.persona,
        tag: [],
        posizione: posizioneMinima - 1, // entra in testa alla fascia
        dataCreazione: now,
        dataCompletamento: null,
      });
    }

    state.registro.push({
      evento: "cattura",
      destinazione,
      via: risultato.via,
      data: now,
    });

    return state;
  });

  return { catturaId, destinazione, via: risultato.via, urgenza: risultato.urgenza };
}

// Corregge con un tocco l'urgenza assegnata dal classificatore a una cattura
// già salvata (i pulsanti del webhook Telegram, prompt A12): aggiorna sempre
// la voce in "catture", e se quella cattura aveva creato anche un task CRM
// (stesso id, vedi sopra) aggiorna anche la sua fascia. Restituisce true se
// ha trovato qualcosa da aggiornare.
export async function correggiUrgenza(catturaId, nuovaUrgenza) {
  if (!Object.prototype.hasOwnProperty.call(FASCIA_DA_URGENZA, nuovaUrgenza)) {
    throw new Error(`Urgenza non valida: ${nuovaUrgenza}`);
  }
  let trovata = false;
  await updateState((state) => {
    const cattura = (state.catture || []).find((c) => c.id === catturaId);
    if (cattura) {
      cattura.urgenza = nuovaUrgenza;
      trovata = true;
    }
    const crmItem = (state.crm || []).find((c) => c.id === catturaId);
    if (crmItem) {
      crmItem.fascia = FASCIA_DA_URGENZA[nuovaUrgenza];
      trovata = true;
    }
    return state;
  });
  return trovata;
}

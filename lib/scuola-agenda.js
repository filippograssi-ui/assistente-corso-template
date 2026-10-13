// Funzioni pure dell'agenda del docente: dall'orario settimanale (classi per
// ora) ai "blocchi" di una giornata (le ore consecutive con la stessa classe
// diventano un unico blocco, es. "1ª-3ª ora · 4A"), ciascuno con la sua
// pagina di agenda (appunti, cose da fare, link, allegati) salvata per data.
//
// Chiave di un blocco: "<classe>@<prima ora>" — stabile finché l'orario non
// cambia; se cambia, le pagine già scritte restano salvate ma non vengono
// più agganciate a nessun blocco (non si perde nulla, semplicemente non si
// vedono più per quel giorno).

export const GIORNI_ORARIO = [
  { chiave: "lun", nome: "Lunedì" },
  { chiave: "mar", nome: "Martedì" },
  { chiave: "mer", nome: "Mercoledì" },
  { chiave: "gio", nome: "Giovedì" },
  { chiave: "ven", nome: "Venerdì" },
];

const CHIAVE_DA_GETDAY = { 1: "lun", 2: "mar", 3: "mer", 4: "gio", 5: "ven" };

// Da una Date alla chiave usata nella griglia dell'orario; null nel weekend.
export function chiaveGiornoOrario(date) {
  return CHIAVE_DA_GETDAY[date.getDay()] || null;
}

export const CHIAVE_BLOCCO_GIORNATA = "giornata";

export function paginaVuota() {
  return { appunti: "", checklist: [], link: [], allegati: [] };
}

function ordinale(n) {
  return `${n}ª`;
}

export function etichettaOre(ore) {
  if (!ore.length) return "";
  if (ore.length === 1) return `${ordinale(ore[0])} ora`;
  return `${ordinale(ore[0])}-${ordinale(ore[ore.length - 1])} ora`;
}

// I blocchi di un giorno della settimana a partire dall'orario.
export function blocchiOrario(orario, giornoChiave) {
  const riga = Array.isArray(orario?.griglia?.[giornoChiave]) ? orario.griglia[giornoChiave] : [];
  const blocchi = [];
  let corrente = null;
  riga.forEach((cella, i) => {
    const classe = typeof cella === "string" ? cella.trim() : "";
    const ora = i + 1;
    if (!classe) {
      corrente = null;
      return;
    }
    if (corrente && corrente.classe === classe && corrente.ore[corrente.ore.length - 1] === ora - 1) {
      corrente.ore.push(ora);
    } else {
      corrente = { chiave: `${classe}@${ora}`, classe, ore: [ora] };
      blocchi.push(corrente);
    }
  });
  return blocchi.map((b) => ({ ...b, etichetta: etichettaOre(b.ore) }));
}

// I blocchi di una data precisa, con la pagina di agenda di ciascuno (vuota
// se non ancora scritta) e, in coda, il blocco libero "giornata" per gli
// appunti non legati a una classe. Le informazioni della classe (link Teams)
// vengono dall'elenco classi.
export function blocchiDelGiorno(scuola, dataChiave, giornoChiave) {
  const pagine = scuola?.agenda?.[dataChiave] || {};
  const classiPerNome = new Map((scuola?.classi || []).map((c) => [c.nome, c]));
  const blocchi = blocchiOrario(scuola?.orario, giornoChiave).map((b) => ({
    ...b,
    classeInfo: classiPerNome.get(b.classe) || null,
    pagina: { ...paginaVuota(), ...(pagine[b.chiave] || {}) },
  }));
  blocchi.push({
    chiave: CHIAVE_BLOCCO_GIORNATA,
    classe: null,
    ore: [],
    etichetta: "Giornata",
    classeInfo: null,
    pagina: { ...paginaVuota(), ...(pagine[CHIAVE_BLOCCO_GIORNATA] || {}) },
  });
  return blocchi;
}

// Una pagina "ha contenuto" se c'è almeno un appunto, una voce, un link o
// un allegato — serve per i pallini sulla striscia della settimana.
export function paginaHaContenuto(pagina) {
  if (!pagina) return false;
  return Boolean(
    (pagina.appunti || "").trim() ||
      (pagina.checklist || []).length ||
      (pagina.link || []).length ||
      (pagina.allegati || []).length
  );
}

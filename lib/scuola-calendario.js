// Calendario scolastico ufficiale (anno 2026/2027), letto dal calendario che Filippo
// ha fornito: definisce l'intervallo dell'anno scolastico e le chiusure infrasettimanali
// (festività + vacanze) usate per calcolare quanti giorni di scuola restano.
//
// Il sabato, anche se nel calendario originale risulta sempre giorno di lezione
// (la scuola fa sei giorni a settimana), qui NON conta mai come giorno scolastico:
// è una scelta esplicita di Filippo per come vuole il conteggio in questa agenda.
// Quindi la regola è semplicemente: dal lunedì al venerdì, dentro l'anno scolastico,
// escludendo questo elenco di giorni feriali di chiusura (la domenica è già sempre
// esclusa in partenza, come nel calendario originale).
export const INIZIO_LEZIONI = "2026-09-14";
export const TERMINE_LEZIONI = "2027-06-08";

const CHIUSURE = new Set([
  "2026-11-02", // ponte di Ognissanti
  "2026-12-07", // ponte dell'Immacolata
  "2026-12-08", // Immacolata Concezione
  "2026-12-21",
  "2026-12-22",
  "2026-12-23",
  "2026-12-24",
  "2026-12-25",
  "2026-12-28",
  "2026-12-29",
  "2026-12-30",
  "2026-12-31", // vacanze di Natale
  "2027-01-01",
  "2027-01-04",
  "2027-01-05",
  "2027-01-06",
  "2027-01-07",
  "2027-01-08", // vacanze di Natale (continuano oltre Capodanno)
  "2027-02-12", // vacanze di Carnevale
  "2027-03-12", // chiusura scolastica
  "2027-03-25",
  "2027-03-26",
  "2027-03-29",
  "2027-03-30",
  "2027-03-31", // vacanze di Pasqua
  "2027-06-02", // Festa della Repubblica
]);

function toDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Vero se questa data (oggetto Date) è un giorno di scuola secondo le regole sopra.
export function eGiornoScolastico(data) {
  const chiave = toDateKey(data);
  if (chiave < INIZIO_LEZIONI || chiave > TERMINE_LEZIONI) return false;
  const giornoSettimana = data.getDay(); // 0 domenica, 6 sabato
  if (giornoSettimana === 0 || giornoSettimana === 6) return false;
  if (CHIUSURE.has(chiave)) return false;
  return true;
}

function contaGiorniScolastici(inizio, fine) {
  let conteggio = 0;
  const cursore = new Date(inizio);
  cursore.setHours(0, 0, 0, 0);
  const ultimo = new Date(fine);
  ultimo.setHours(0, 0, 0, 0);
  while (cursore <= ultimo) {
    if (eGiornoScolastico(cursore)) conteggio++;
    cursore.setDate(cursore.getDate() + 1);
  }
  return conteggio;
}

// Riassunto per il contatore mostrato in agenda: giorni scolastici totali
// dell'anno, quelli già trascorsi e quelli che restano da oggi alla fine.
export function riassuntoAnnoScolastico(oggi = new Date()) {
  const inizio = new Date(`${INIZIO_LEZIONI}T00:00:00`);
  const fine = new Date(`${TERMINE_LEZIONI}T00:00:00`);
  const oggiMezzanotte = new Date(oggi);
  oggiMezzanotte.setHours(0, 0, 0, 0);

  const totali = contaGiorniScolastici(inizio, fine);

  if (oggiMezzanotte > fine) {
    return { totali, trascorsi: totali, rimanenti: 0, finito: true, iniziato: true };
  }
  if (oggiMezzanotte < inizio) {
    return { totali, trascorsi: 0, rimanenti: totali, finito: false, iniziato: false };
  }
  const rimanenti = contaGiorniScolastici(oggiMezzanotte, fine);
  return { totali, trascorsi: totali - rimanenti, rimanenti, finito: false, iniziato: true };
}

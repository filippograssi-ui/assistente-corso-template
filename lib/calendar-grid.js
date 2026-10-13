// Funzioni pure di calcolo griglia mese, condivise dal calendario mensile della Home
// e dal calendario filtrato della Scuola — stessa logica di visualizzazione, dati diversi.

export const GIORNI = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];
export const MESI = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
];

export function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function toDateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Griglia di 42 celle (6 settimane) che copre sempre il mese, a partire dal lunedì
// on/before il primo del mese — così la vista è stabile indipendentemente da quanti
// giorni ha il mese o da che giorno della settimana comincia.
export function grigliaMese(meseVisualizzato) {
  const primoDelMese = new Date(meseVisualizzato.getFullYear(), meseVisualizzato.getMonth(), 1);
  const offset = (primoDelMese.getDay() + 6) % 7; // 0 = lunedì
  const inizioGriglia = new Date(primoDelMese);
  inizioGriglia.setDate(inizioGriglia.getDate() - offset);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(inizioGriglia);
    d.setDate(d.getDate() + i);
    return d;
  });
}

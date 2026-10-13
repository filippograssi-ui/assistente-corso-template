// Coloriamo gli eventi del calendario con una logica nostra: il link "segreto" di
// Google Calendar non porta con sé i colori che vedi tu nell'app di Google (sono un
// dettaglio dell'account, non dell'iCal standard). Per ora l'unica categoria è
// "scuola", riconosciuta per parola chiave — configurabile da .env.local
// (SCUOLA_PAROLE_CHIAVE, separate da virgola) così Filippo la aggiusta da solo
// senza toccare il codice. Tutto il resto prende il colore di base.
const COLORE_DEFAULT = "var(--accent)";
const COLORE_SCUOLA = "#f59e0b"; // arancione, per distinguerlo a colpo d'occhio

function paroleScuola() {
  const raw = process.env.SCUOLA_PAROLE_CHIAVE || "";
  return raw
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
}

export function categoriaEvento(summary) {
  const testo = (summary || "").toLowerCase();
  const parole = paroleScuola();
  if (parole.length && parole.some((p) => testo.includes(p))) {
    return "scuola";
  }
  return "generale";
}

export function coloreCategoria(categoria) {
  return categoria === "scuola" ? COLORE_SCUOLA : COLORE_DEFAULT;
}

export function coloraEvento(summary) {
  return coloreCategoria(categoriaEvento(summary));
}

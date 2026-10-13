// Ambiti della sezione Svago con una lista "da fare / fatto". La chiave è anche il segmento usato nelle rotte /api/svago/[ambito] e la
// chiave sotto state.svago. "cosa"/"cosaPlurale" sono usati nei testi
// dell'interfaccia e nel prompt del suggeritore IA, per non ripetere le
// stesse frasi hardcoded in più punti.
export const AMBITI_SVAGO = {
  viaggio: {
    chiave: "viaggio",
    etichetta: "Viaggio",
    cosa: "una meta o un'idea di viaggio",
    cosaPlurale: "mete o idee di viaggio",
  },
  watchlist: {
    chiave: "watchlist",
    etichetta: "Watch list",
    cosa: "un film o una serie da guardare",
    cosaPlurale: "film o serie da guardare",
  },
  posti: {
    chiave: "posti",
    etichetta: "Uscite con gli amici",
    cosa: "un locale, un evento o un'attività da fare con gli amici",
    cosaPlurale: "posti o attività da fare con gli amici",
  },
  libri: {
    chiave: "libri",
    etichetta: "Libri",
    cosa: "un libro da leggere",
    cosaPlurale: "libri da leggere",
  },
};

export const GENERI_LIBRI = [
  "Romanzo",
  "Giallo / Thriller",
  "Fantasy",
  "Fantascienza",
  "Storico",
  "Saggio",
  "Biografia",
  "Poesia",
  "Classico",
  "Per la scuola",
  "Fumetto / Graphic novel",
];

export function ambitoSvagoValido(ambito) {
  return Object.prototype.hasOwnProperty.call(AMBITI_SVAGO, ambito);
}

// Valori per i menu a tendina dei campi extra di Watch list (richiesta di
// Filippo: piattaforma, film o serie, genere). Riusano MateriaSelect (il
// componente "select + Altro" già usato in Scuola) passando queste liste
// come opzioni, così qualunque valore non elencato si può comunque scrivere
// a mano scegliendo "Altro".
export const PIATTAFORME_WATCHLIST = [
  "Netflix",
  "Prime Video",
  "Disney+",
  "Sky / NOW",
  "Apple TV+",
  "Paramount+",
  "Cinema",
];

export const GENERI_WATCHLIST = [
  "Azione",
  "Avventura",
  "Commedia",
  "Drammatico",
  "Fantascienza",
  "Fantasy",
  "Horror",
  "Thriller",
  "Animazione",
  "Documentario",
  "Romantico",
  "Crime",
];

export const TIPI_WATCHLIST = ["Film", "Serie"];

// Tavolozza condivisa in stile Google Calendar, usata sia per gli eventi del
// calendario sia per le abitudini, così l'utente sceglie sempre tra gli stessi
// colori riconoscibili invece di un selettore diverso per ogni scheda.
export const TAVOLOZZA = [
  { nome: "Pomodoro", colore: "#d64545" },
  { nome: "Mandarino", colore: "#e08a2c" },
  { nome: "Banana", colore: "#e0c02c" },
  { nome: "Salvia", colore: "#1f9d55" },
  { nome: "Pavone", colore: "#2c9d9d" },
  { nome: "Mirtillo", colore: "#2f6fed" },
  { nome: "Lavanda", colore: "#8e7ce0" },
  { nome: "Uva", colore: "#8e44ad" },
  { nome: "Grafite", colore: "#6b7280" },
];

export function coloreValido(valore) {
  return typeof valore === "string" && /^#[0-9a-fA-F]{6}$/.test(valore.trim()) ? valore.trim() : null;
}

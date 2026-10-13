import { getTodayKey, formatDateKey } from "./date.js";

// Percentuale di completamento del giorno: le spunte valgono piene (1),
// i contatori in proporzione al loro obiettivo (max 1).
export function computeCompletion(abitudini, logDiOggi) {
  if (!abitudini.length) return 0;
  const valori = abitudini.map((h) => {
    const v = logDiOggi?.[h.id];
    if (h.tipo === "spunta") return v ? 1 : 0;
    const obiettivo = h.obiettivo || 1;
    return Math.min(1, (v || 0) / obiettivo);
  });
  const somma = valori.reduce((a, b) => a + b, 0);
  return Math.round((somma / abitudini.length) * 100);
}

function giornoCompletato(log) {
  return Boolean(log) && Object.values(log.abitudini || {}).some((v) => v === true || (typeof v === "number" && v > 0));
}

// Giorni consecutivi con almeno un'abitudine completata. Oggi NON è
// obbligatorio: se non hai ancora spuntato nulla oggi la serie non si azzera
// subito (avresti tutta la giornata davanti per farlo) — si riparte da ieri.
// Se anche ieri manca, la serie è davvero interrotta e torna a 0.
export function computeStreak(logGiornalieri, timezone) {
  let streak = 0;
  let cursor = new Date();
  const chiaveOggi = formatDateKey(cursor, timezone);
  const oggiCompletato = giornoCompletato(logGiornalieri[chiaveOggi]);
  if (!oggiCompletato) {
    cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
  }
  for (let i = 0; i < 3650; i++) {
    const key = formatDateKey(cursor, timezone);
    if (!giornoCompletato(logGiornalieri[key])) break;
    streak += 1;
    cursor = new Date(cursor.getTime() - 24 * 60 * 60 * 1000);
  }
  return streak;
}

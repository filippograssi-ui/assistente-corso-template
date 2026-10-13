// Regola 5 della guida: "che giorno è oggi" ha una sola risposta nel codice.
// Usa sempre questa funzione per calcolare la data corrente — mai `new Date()`
// interpretata nel fuso del server, che su molte piattaforme è UTC.

const DEFAULT_TIMEZONE = "Europe/Rome";

export function getTimezone() {
  return process.env.USER_TIMEZONE || DEFAULT_TIMEZONE;
}

// Restituisce la data di "oggi" nel fuso dell'utente, come stringa YYYY-MM-DD.
export function getTodayKey(timezone = getTimezone()) {
  return formatDateKey(new Date(), timezone);
}

// Converte una Date qualsiasi nella chiave YYYY-MM-DD nel fuso indicato.
// en-CA restituisce già il formato ISO ordinato, senza doverlo ricostruire a mano.
export function formatDateKey(date, timezone = getTimezone()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

// Elenco di chiavi YYYY-MM-DD comprese tra due date (incluse), utile per leggere
// intervalli di log giornalieri.
export function getDateKeysBetween(startKey, endKey) {
  const keys = [];
  let cursor = new Date(`${startKey}T12:00:00Z`); // mezzogiorno UTC: evita salti di giorno per DST
  const end = new Date(`${endKey}T12:00:00Z`);
  while (cursor <= end) {
    keys.push(formatDateKey(cursor));
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }
  return keys;
}

// Sposta una chiave YYYY-MM-DD di N giorni (anche negativi), restando nel fuso dell'utente.
export function addDaysToKey(dateKey, days, timezone = getTimezone()) {
  const cursor = new Date(`${dateKey}T12:00:00Z`);
  cursor.setUTCDate(cursor.getUTCDate() + days);
  return formatDateKey(cursor, timezone);
}


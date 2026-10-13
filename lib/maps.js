// Costruisce un link di ricerca su Google Maps a partire da un luogo scritto
// a mano (nome del posto o indirizzo) — usa l'URL pubblico "search", quindi
// non serve nessuna API key né configurazione.
export function linkGoogleMaps(luogo) {
  const pulito = typeof luogo === "string" ? luogo.trim() : "";
  if (!pulito) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(pulito)}`;
}

// Gli allegati dell'agenda scuola (file utili alla lezione) vivono su disco in
// data/allegati/<id>.<estensione> — fuori da public/, così non sono mai
// raggiungibili da un URL diretto ma solo passando dalla rotta API (che nel
// Percorso Completo sarà protetta dal cancello). Nel Percorso Completo questa
// cartella sarà sostituita da uno storage online (es. Supabase Storage).
import fs from "node:fs";
import path from "node:path";

export const CARTELLA_ALLEGATI = path.join(process.cwd(), "data", "allegati");
export const DIMENSIONE_MASSIMA = 25 * 1024 * 1024; // 25 MB per file

export function percorsoAllegato(nomeFile) {
  // Solo il nome del file, mai un percorso: impedisce di uscire dalla cartella.
  return path.join(CARTELLA_ALLEGATI, path.basename(nomeFile));
}

export function salvaAllegato(nomeFile, buffer) {
  fs.mkdirSync(CARTELLA_ALLEGATI, { recursive: true });
  fs.writeFileSync(percorsoAllegato(nomeFile), buffer);
}

export function leggiAllegato(nomeFile) {
  const p = percorsoAllegato(nomeFile);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p);
}

export function eliminaAllegato(nomeFile) {
  const p = percorsoAllegato(nomeFile);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

// Estensione sicura (solo lettere/numeri, max 10 caratteri) dal nome originale.
export function estensioneSicura(nomeOriginale) {
  const m = /\.([a-zA-Z0-9]{1,10})$/.exec(nomeOriginale || "");
  return m ? m[1].toLowerCase() : "bin";
}

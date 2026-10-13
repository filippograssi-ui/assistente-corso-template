// Unico punto di accesso ai dati (Percorso Locale): tutto vive in un solo
// file JSON, data/assistente.json. Nessuna rotta e nessun componente tocca
// quel file direttamente — passano sempre da qui. Quando si passerà al
// Percorso Completo (Supabase), si riscrive SOLO questo file mantenendo le
// stesse funzioni esportate: il resto dell'app non cambia.
//
// Tutte le funzioni sono async anche se qui lavorano su disco in modo
// sincrono: così le rotte sono già scritte nel modo giusto per quando
// dietro ci sarà un database vero.
import fs from "node:fs";
import path from "node:path";
import { getDateKeysBetween } from "./date.js";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE_PATH = path.join(DATA_DIR, "assistente.json");
const SEED_PATH = path.join(DATA_DIR, "seed.json");

function leggiSeed() {
  return JSON.parse(fs.readFileSync(SEED_PATH, "utf-8"));
}

// Prima lettura: se il file dei dati non esiste ancora, lo si crea dal seed
// (il "reset di fabbrica", che non va mai modificato a mano).
function leggiFile() {
  if (!fs.existsSync(FILE_PATH)) {
    const seed = leggiSeed();
    scriviFile(seed);
    return seed;
  }
  return JSON.parse(fs.readFileSync(FILE_PATH, "utf-8"));
}

// Scrittura atomica: si scrive su un file temporaneo e poi si rinomina, così
// un crash a metà scrittura non lascia mai un JSON troncato.
function scriviFile(state) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${FILE_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2), "utf-8");
  fs.renameSync(tmp, FILE_PATH);
}

// Garantisce che le chiavi principali esistano anche su un file salvato da
// una versione precedente dell'app (aggiunta di nuove sezioni nel tempo).
function normalizza(state) {
  const seed = leggiSeed();
  for (const chiave of Object.keys(seed)) {
    if (state[chiave] === undefined) state[chiave] = seed[chiave];
  }
  if (!state.logGiornalieri) state.logGiornalieri = {};
  return state;
}

export async function readState() {
  return normalizza(leggiFile());
}

export async function writeState(state) {
  scriviFile(state);
  return state;
}

export async function updateState(updaterFn) {
  const current = await readState();
  const next = updaterFn(current) || current;
  return writeState(next);
}

export async function resetState() {
  const seed = leggiSeed();
  scriviFile(seed);
  return seed;
}

// ============================================================
// Log giornalieri (abitudini, pasti): una voce per data YYYY-MM-DD
// ============================================================

function logVuoto() {
  return { abitudini: {}, pasti: [], obiettiviFinanza: null };
}

export async function readDailyLog(dateKey) {
  const state = await readState();
  return { ...logVuoto(), ...(state.logGiornalieri[dateKey] || {}) };
}

export async function readDailyLogsRange(startKey, endKey) {
  const state = await readState();
  const risultato = {};
  for (const key of getDateKeysBetween(startKey, endKey)) {
    risultato[key] = { ...logVuoto(), ...(state.logGiornalieri[key] || {}) };
  }
  return risultato;
}

export async function readAllDailyLogs() {
  const state = await readState();
  return state.logGiornalieri || {};
}

export async function updateDailyLog(dateKey, updaterFn) {
  let nuovo = null;
  await updateState((state) => {
    const attuale = { ...logVuoto(), ...(state.logGiornalieri[dateKey] || {}) };
    nuovo = updaterFn(attuale) || attuale;
    state.logGiornalieri[dateKey] = nuovo;
    return state;
  });
  return nuovo;
}

// Unico punto di accesso ai dati. Due "motori", scelti da soli in base alla
// configurazione, con le STESSE funzioni esportate — il resto dell'app non
// sa quale dei due sta usando:
//
//  1. FILE (Percorso Locale): tutto in data/assistente.json sul computer.
//     Online (es. su Vercel) la cartella del progetto è in sola lettura: in
//     quel caso si scrive in una cartella temporanea — l'app funziona ma
//     "dimentica" i dati dopo un po'. È voluto: è il motivo per cui alla
//     lezione dopo si passa a un database vero.
//  2. SUPABASE (Percorso Completo): appena ci sono NEXT_PUBLIC_SUPABASE_URL e
//     SUPABASE_SERVICE_ROLE_KEY, tutto lo stato vive in UNA riga della
//     tabella "stato" (colonna dati, jsonb). Per un assistente a utente
//     singolo è più che sufficiente, e nessuna rotta deve cambiare.
//
// Tutte le funzioni sono async in entrambi i casi.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getDateKeysBetween } from "./date.js";
import { supabase, supabaseConfigurato, userId } from "./supabase.js";

const DATA_DIR = path.join(process.cwd(), "data");
const SEED_PATH = path.join(DATA_DIR, "seed.json");

function leggiSeed() {
  return JSON.parse(fs.readFileSync(SEED_PATH, "utf-8"));
}

// Garantisce che le chiavi principali esistano anche su uno stato salvato da
// una versione precedente dell'app (aggiunta di nuove sezioni nel tempo).
function normalizza(state) {
  const seed = leggiSeed();
  for (const chiave of Object.keys(seed)) {
    if (state[chiave] === undefined) state[chiave] = seed[chiave];
  }
  if (!state.logGiornalieri) state.logGiornalieri = {};
  return state;
}

// ------------------------------------------------------------
// Motore FILE
// ------------------------------------------------------------

let cartellaDati = null;

function cartellaScrivibile() {
  if (cartellaDati) return cartellaDati;
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.accessSync(DATA_DIR, fs.constants.W_OK);
    cartellaDati = DATA_DIR;
  } catch {
    // Cartella del progetto in sola lettura (hosting serverless): si usa la
    // cartella temporanea del sistema — dati non persistenti.
    cartellaDati = path.join(os.tmpdir(), "assistente-dati");
    fs.mkdirSync(cartellaDati, { recursive: true });
  }
  return cartellaDati;
}

function percorsoFile() {
  return path.join(cartellaScrivibile(), "assistente.json");
}

function leggiFile() {
  const p = percorsoFile();
  if (!fs.existsSync(p)) {
    const seed = leggiSeed();
    scriviFile(seed);
    return seed;
  }
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

// Scrittura atomica: file temporaneo + rinomina, così un crash a metà non
// lascia mai un JSON troncato.
function scriviFile(state) {
  const p = percorsoFile();
  const tmp = `${p}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2), "utf-8");
  fs.renameSync(tmp, p);
}

// ------------------------------------------------------------
// Motore SUPABASE (tabella "stato": user_id, dati, aggiornato_il)
// ------------------------------------------------------------

async function leggiSupabase() {
  const { data, error } = await supabase().from("stato").select("dati").eq("user_id", userId()).maybeSingle();
  if (error) throw new Error(`Supabase (stato, lettura): ${error.message}`);
  if (!data) {
    const seed = leggiSeed();
    await scriviSupabase(seed);
    return seed;
  }
  return data.dati;
}

async function scriviSupabase(state) {
  const { error } = await supabase()
    .from("stato")
    .upsert({ user_id: userId(), dati: state, aggiornato_il: new Date().toISOString() }, { onConflict: "user_id" });
  if (error) throw new Error(`Supabase (stato, scrittura): ${error.message}`);
}

// ------------------------------------------------------------
// Interfaccia comune
// ------------------------------------------------------------

export function motoreDati() {
  return supabaseConfigurato() ? "supabase" : cartellaScrivibile() === DATA_DIR ? "file" : "file-temporaneo";
}

export async function readState() {
  const state = supabaseConfigurato() ? await leggiSupabase() : leggiFile();
  return normalizza(state);
}

export async function writeState(state) {
  if (supabaseConfigurato()) await scriviSupabase(state);
  else scriviFile(state);
  return state;
}

export async function updateState(updaterFn) {
  const current = await readState();
  const next = updaterFn(current) || current;
  return writeState(next);
}

export async function resetState() {
  const seed = leggiSeed();
  await writeState(seed);
  return seed;
}

// ------------------------------------------------------------
// Log giornalieri (abitudini, pasti): una voce per data YYYY-MM-DD
// ------------------------------------------------------------

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

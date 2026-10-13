// Gli allegati dell'agenda scuola (file utili alla lezione). Due posti
// possibili, scelti da soli come in lib/store.js:
//  - in locale: su disco, in data/allegati/ (fuori da public/, mai
//    raggiungibili da un URL diretto, solo passando dalla rotta API);
//  - con Supabase configurato: in un bucket privato di Supabase Storage
//    chiamato "allegati", creato da solo la prima volta che serve.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { supabase, supabaseConfigurato, userId } from "./supabase.js";

export const DIMENSIONE_MASSIMA = 25 * 1024 * 1024; // 25 MB per file
const BUCKET = "allegati";

let cartella = null;
function cartellaAllegati() {
  if (cartella) return cartella;
  const locale = path.join(process.cwd(), "data", "allegati");
  try {
    fs.mkdirSync(locale, { recursive: true });
    fs.accessSync(locale, fs.constants.W_OK);
    cartella = locale;
  } catch {
    cartella = path.join(os.tmpdir(), "assistente-allegati");
    fs.mkdirSync(cartella, { recursive: true });
  }
  return cartella;
}

function percorsoLocale(nomeFile) {
  // Solo il nome del file, mai un percorso: impedisce di uscire dalla cartella.
  return path.join(cartellaAllegati(), path.basename(nomeFile));
}

function chiaveStorage(nomeFile) {
  return `${userId()}/${path.basename(nomeFile)}`;
}

let bucketPronto = false;
async function assicuraBucket() {
  if (bucketPronto) return;
  const { data } = await supabase().storage.getBucket(BUCKET);
  if (!data) {
    const { error } = await supabase().storage.createBucket(BUCKET, { public: false, fileSizeLimit: DIMENSIONE_MASSIMA });
    if (error && !/already exists/i.test(error.message)) throw new Error(`Supabase Storage (bucket): ${error.message}`);
  }
  bucketPronto = true;
}

export async function salvaAllegato(nomeFile, buffer, tipo = "application/octet-stream") {
  if (supabaseConfigurato()) {
    await assicuraBucket();
    const { error } = await supabase().storage.from(BUCKET).upload(chiaveStorage(nomeFile), buffer, { contentType: tipo, upsert: true });
    if (error) throw new Error(`Supabase Storage (upload): ${error.message}`);
    return;
  }
  fs.writeFileSync(percorsoLocale(nomeFile), buffer);
}

export async function leggiAllegato(nomeFile) {
  if (supabaseConfigurato()) {
    const { data, error } = await supabase().storage.from(BUCKET).download(chiaveStorage(nomeFile));
    if (error || !data) return null;
    return Buffer.from(await data.arrayBuffer());
  }
  const p = percorsoLocale(nomeFile);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p);
}

export async function eliminaAllegato(nomeFile) {
  if (supabaseConfigurato()) {
    await supabase().storage.from(BUCKET).remove([chiaveStorage(nomeFile)]);
    return;
  }
  const p = percorsoLocale(nomeFile);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

// Estensione sicura (solo lettere/numeri, max 10 caratteri) dal nome originale.
export function estensioneSicura(nomeOriginale) {
  const m = /\.([a-zA-Z0-9]{1,10})$/.exec(nomeOriginale || "");
  return m ? m[1].toLowerCase() : "bin";
}

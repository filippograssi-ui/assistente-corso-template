// Client Supabase lato server (Percorso Completo, Lezione 3). Usa la chiave
// di SERVIZIO (mai esposta al browser): salta la Row Level Security, quindi
// solo il server dell'app può leggere/scrivere — il database resta chiuso a
// tutti gli altri. Le tabelle hanno la RLS attiva senza nessuna policy.
import { createClient } from "@supabase/supabase-js";

let client = null;

export function supabaseConfigurato() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function supabase() {
  if (!client) {
    client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

// Un solo utente per assistente: il suo id è fisso (cambialo in .env se vuoi).
export function userId() {
  return process.env.USER_ID || "io";
}

-- Lezione 3 — il database dell'assistente. Incolla ed esegui TUTTO questo
-- testo nell'SQL Editor di Supabase (pulsante "Run").
--
-- Una sola tabella: l'intero stato dell'assistente vive nella colonna "dati"
-- (JSON). Per un assistente a utente singolo è tutto quello che serve.

create table if not exists stato (
  user_id text primary key,
  dati jsonb not null,
  aggiornato_il timestamptz not null default now()
);

-- Sicurezza: Row Level Security attiva SENZA nessuna policy. Vuol dire che
-- nessuno può leggere o scrivere passando dal browser; solo il server
-- dell'app, con la chiave di servizio, può farlo.
alter table stato enable row level security;

// Un solo posto per i nomi dei modelli. Anthropic ritira ogni tanto le versioni
// più vecchie (vedi la pagina "Model deprecations") — quando succede, le chiamate
// a quel modello falliscono e il codice ripiega silenziosamente sulle regole o
// sulle stime di riserva già previste per quando manca la chiave API. Il
// risultato è che tutto SEMBRA funzionare ma il modello, in realtà, non viene
// mai interpellato — è esattamente quello che è successo qui con due ID di
// modello ("claude-3-5-haiku-20241022" e "claude-3-5-sonnet-20241022") ritirati
// da Anthropic. Un solo file da aggiornare quando ricapita, invece di sette
// sparsi nel codice.
export const MODELLO_VELOCE = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
export const MODELLO_QUALITA = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

// Modello di embedding (prompt A15, strato di memoria) — stessa idea: un solo
// posto da aggiornare, con text-embedding-3-small come predefinito nel codice.
export const MODELLO_EMBEDDING = process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";

import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { updateState } from "@/lib/store";
import { paginaVuota } from "@/lib/scuola-agenda";
import { salvaAllegato, estensioneSicura, DIMENSIONE_MASSIMA } from "@/lib/allegati";

export const dynamic = "force-dynamic";

// POST multipart: file + data + blocco → salva il file su disco e lo aggancia
// alla pagina di agenda di quel blocco.
export async function POST(request) {
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Richiesta non valida" }, { status: 400 });
  const file = form.get("file");
  const data = form.get("data");
  const blocco = form.get("blocco");
  if (!file || typeof file === "string") return NextResponse.json({ error: "File mancante" }, { status: 400 });
  if (typeof data !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data) || typeof blocco !== "string" || !blocco) {
    return NextResponse.json({ error: "Data o blocco mancanti" }, { status: 400 });
  }
  if (file.size > DIMENSIONE_MASSIMA) {
    return NextResponse.json({ error: "File troppo grande (massimo 25 MB)" }, { status: 400 });
  }

  const id = randomUUID();
  const nomeSuDisco = `${id}.${estensioneSicura(file.name)}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    await salvaAllegato(nomeSuDisco, buffer, file.type || "application/octet-stream");
  } catch (err) {
    return NextResponse.json({ error: err.message || "Salvataggio del file fallito" }, { status: 502 });
  }

  const allegato = {
    id,
    nome: (file.name || "allegato").slice(0, 200),
    file: nomeSuDisco,
    tipo: file.type || "application/octet-stream",
    dimensione: file.size,
    caricatoIl: new Date().toISOString(),
  };

  let pagina = null;
  await updateState((s) => {
    if (!s.scuola) s.scuola = {};
    if (!s.scuola.agenda || Array.isArray(s.scuola.agenda)) s.scuola.agenda = {};
    if (!s.scuola.agenda[data]) s.scuola.agenda[data] = {};
    const p = { ...paginaVuota(), ...(s.scuola.agenda[data][blocco] || {}) };
    p.allegati = [...(p.allegati || []), allegato];
    s.scuola.agenda[data][blocco] = p;
    pagina = p;
    return s;
  });
  return NextResponse.json({ allegato, pagina }, { status: 201 });
}

import { NextResponse } from "next/server";
import { readState, updateState } from "@/lib/store";
import { leggiAllegato, eliminaAllegato } from "@/lib/allegati";

export const dynamic = "force-dynamic";

// Cerca un allegato in tutte le pagine di agenda (sono poche: una per blocco
// per giorno), restituendo anche dove si trova.
function trovaAllegato(state, id) {
  const agenda = state.scuola?.agenda || {};
  for (const data of Object.keys(agenda)) {
    for (const blocco of Object.keys(agenda[data])) {
      const a = (agenda[data][blocco].allegati || []).find((x) => x.id === id);
      if (a) return { allegato: a, data, blocco };
    }
  }
  return null;
}

// GET: scarica/apre il file (apre nel browser se è un PDF o un'immagine).
export async function GET(request, { params }) {
  const { id } = await params;
  const state = await readState();
  const trovato = trovaAllegato(state, id);
  if (!trovato) return NextResponse.json({ error: "Allegato non trovato" }, { status: 404 });
  const contenuto = await leggiAllegato(trovato.allegato.file);
  if (!contenuto) return NextResponse.json({ error: "File non più presente su disco" }, { status: 404 });
  const inline = /^(application\/pdf|image\/)/.test(trovato.allegato.tipo);
  return new NextResponse(contenuto, {
    headers: {
      "Content-Type": trovato.allegato.tipo,
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(trovato.allegato.nome)}`,
    },
  });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  let pagina = null;
  let file = null;
  await updateState((s) => {
    const trovato = trovaAllegato(s, id);
    if (!trovato) return s;
    file = trovato.allegato.file;
    const p = s.scuola.agenda[trovato.data][trovato.blocco];
    p.allegati = (p.allegati || []).filter((a) => a.id !== id);
    pagina = p;
    return s;
  });
  if (!pagina) return NextResponse.json({ error: "Allegato non trovato" }, { status: 404 });
  await eliminaAllegato(file).catch(() => {});
  return NextResponse.json({ pagina });
}

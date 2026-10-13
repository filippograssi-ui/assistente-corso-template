import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { updateState } from "@/lib/store";
import { leggiEsportazione } from "@/lib/apple-salute";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

// POST multipart (file = export.zip o export.xml di Apple Salute): importa
// peso e allenamenti. Rilanciare l'import non crea doppioni: gli allenamenti
// hanno un id derivato dalla data/ora, il peso è uno per giorno.
export async function POST(request) {
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!file || typeof file === "string") return NextResponse.json({ error: "File mancante" }, { status: 400 });
  if (file.size > 1.5 * 1024 * 1024 * 1024) return NextResponse.json({ error: "File troppo grande" }, { status: 400 });

  let letto;
  try {
    letto = leggiEsportazione(Buffer.from(await file.arrayBuffer()), file.name || "");
  } catch (err) {
    return NextResponse.json({ error: err.message || "Lettura del file fallita" }, { status: 400 });
  }

  let pesiNuovi = 0;
  let allenamentiNuovi = 0;
  await updateState((s) => {
    if (!s.salute) s.salute = { pesoLog: [], allenamenti: [] };
    if (!Array.isArray(s.salute.pesoLog)) s.salute.pesoLog = [];
    if (!Array.isArray(s.salute.allenamenti)) s.salute.allenamenti = [];

    const pesoPerData = new Map(s.salute.pesoLog.map((v) => [v.data, v]));
    for (const p of letto.peso) {
      const esistente = pesoPerData.get(p.data);
      if (esistente && esistente.fonte !== "apple") continue; // un peso scritto a mano vince
      if (!esistente) pesiNuovi += 1;
      pesoPerData.set(p.data, { id: esistente?.id || randomUUID(), data: p.data, kg: p.kg, nota: "", fonte: "apple" });
    }
    s.salute.pesoLog = [...pesoPerData.values()].sort((a, b) => (a.data < b.data ? -1 : 1));

    const idEsistenti = new Set(s.salute.allenamenti.map((a) => a.id));
    for (const a of letto.allenamenti) {
      if (idEsistenti.has(a.id)) continue;
      s.salute.allenamenti.push(a);
      idEsistenti.add(a.id);
      allenamentiNuovi += 1;
    }
    s.integrazioni = s.integrazioni || {};
    s.integrazioni.appleSalute = { ultimaImportazione: new Date().toISOString(), pesi: letto.peso.length, allenamenti: letto.allenamenti.length };
    return s;
  });

  return NextResponse.json({ pesiNuovi, allenamentiNuovi, pesiTotali: letto.peso.length, allenamentiTotali: letto.allenamenti.length });
}

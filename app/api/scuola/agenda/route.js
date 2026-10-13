import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { readState, updateState } from "@/lib/store";
import { blocchiDelGiorno, chiaveGiornoOrario, paginaVuota, paginaHaContenuto } from "@/lib/scuola-agenda";

export const dynamic = "force-dynamic";

function dataValida(d) {
  return typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d);
}

// GET /api/scuola/agenda?data=YYYY-MM-DD&settimana=YYYY-MM-DD
//  - data: i blocchi di quel giorno (classi dall'orario) con le loro pagine
//  - settimana (lunedì): per ciascun giorno lun-ven se c'è già contenuto
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const data = searchParams.get("data");
  const settimana = searchParams.get("settimana");
  const state = await readState();
  const risposta = {};

  if (dataValida(data)) {
    const giorno = chiaveGiornoOrario(new Date(`${data}T12:00:00`));
    risposta.data = data;
    risposta.weekend = !giorno;
    risposta.blocchi = giorno ? blocchiDelGiorno(state.scuola, data, giorno) : blocchiDelGiorno(state.scuola, data, "");
  }

  if (dataValida(settimana)) {
    const conContenuto = {};
    for (let i = 0; i < 5; i++) {
      const d = new Date(`${settimana}T12:00:00`);
      d.setDate(d.getDate() + i);
      const chiave = d.toISOString().slice(0, 10);
      const pagine = state.scuola?.agenda?.[chiave] || {};
      conContenuto[chiave] = Object.values(pagine).some(paginaHaContenuto);
    }
    risposta.settimana = conContenuto;
  }

  return NextResponse.json(risposta);
}

// PUT /api/scuola/agenda — salva (o aggiorna) la pagina di un blocco.
// Body: { data, blocco, appunti?, checklist?, link? } — gli allegati hanno la
// loro rotta (upload multipart). Si salva il pezzo che arriva, il resto della
// pagina resta com'è.
export async function PUT(request) {
  const body = await request.json().catch(() => null);
  const data = body?.data;
  const blocco = typeof body?.blocco === "string" ? body.blocco.slice(0, 60) : "";
  if (!dataValida(data) || !blocco) return NextResponse.json({ error: "Data o blocco mancanti" }, { status: 400 });

  let pagina = null;
  await updateState((s) => {
    if (!s.scuola) s.scuola = {};
    if (!s.scuola.agenda || Array.isArray(s.scuola.agenda)) s.scuola.agenda = {};
    if (!s.scuola.agenda[data]) s.scuola.agenda[data] = {};
    const p = { ...paginaVuota(), ...(s.scuola.agenda[data][blocco] || {}) };
    if (typeof body.appunti === "string") p.appunti = body.appunti.slice(0, 20000);
    if (Array.isArray(body.checklist)) {
      p.checklist = body.checklist
        .filter((v) => v && typeof v.testo === "string" && v.testo.trim())
        .slice(0, 100)
        .map((v) => ({ id: typeof v.id === "string" ? v.id : randomUUID(), testo: v.testo.trim().slice(0, 300), fatto: Boolean(v.fatto) }));
    }
    if (Array.isArray(body.link)) {
      p.link = body.link
        .filter((v) => v && typeof v.url === "string" && v.url.trim())
        .slice(0, 50)
        .map((v) => ({
          id: typeof v.id === "string" ? v.id : randomUUID(),
          titolo: typeof v.titolo === "string" ? v.titolo.trim().slice(0, 120) : "",
          url: v.url.trim().slice(0, 1000),
        }));
    }
    s.scuola.agenda[data][blocco] = p;
    pagina = p;
    return s;
  });
  return NextResponse.json({ pagina });
}

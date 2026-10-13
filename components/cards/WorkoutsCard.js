"use client";

import { useEffect, useRef, useState } from "react";

// Etichetta leggibile della categoria: le voci importate da Apple Salute
// hanno già un tipo in italiano; quelle scritte a mano usano il tipo scritto.
function etichettaSport(sport, tipo) {
  return tipo || sport || "Manuale";
}

function formattaData(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

// Statistiche degli ultimi 7 giorni, divise per tipologia di allenamento
// (Corsa, Ciclismo, Escursione, ... o "Manuale") invece che un unico totale.
// È la parte più in vista della scheda, quindi ha uno spazio maggiorato.
function calcolaStatistichePerTipo(log) {
  const oggi = new Date();
  const settePrima = new Date(oggi);
  settePrima.setDate(settePrima.getDate() - 6); // ultimi 7 giorni, oggi incluso
  const sogliaKey = settePrima.toISOString().slice(0, 10);
  const recenti = log.filter((v) => v.data && v.data >= sogliaKey);
  const perTipo = new Map();
  for (const v of recenti) {
    const etichetta = etichettaSport(v.sport, v.tipo);
    const corrente = perTipo.get(etichetta) || { etichetta, numero: 0, minutiTotali: 0, kmTotali: 0 };
    corrente.numero += 1;
    corrente.minutiTotali += v.durataMinuti || 0;
    corrente.kmTotali += v.distanzaKm || 0;
    perTipo.set(etichetta, corrente);
  }
  return [...perTipo.values()]
    .map((c) => ({ ...c, kmTotali: Math.round(c.kmTotali * 10) / 10 }))
    .sort((a, b) => b.numero - a.numero);
}

// Raggruppa lo storico per categoria (Corsa, Ciclismo, Escursione, ... o
// "Manuale" per le voci senza sport Strava), più recenti nel conteggio.
function calcolaCategorie(log) {
  const conteggi = new Map();
  for (const v of log) {
    const etichetta = etichettaSport(v.sport, v.tipo);
    conteggi.set(etichetta, (conteggi.get(etichetta) || 0) + 1);
  }
  return [...conteggi.entries()].sort((a, b) => b[1] - a[1]);
}

export default function WorkoutsCard() {
  const [log, setLog] = useState(null);
  const [tipo, setTipo] = useState("");
  const [durata, setDurata] = useState("");
  const [nota, setNota] = useState("");
  const [inviando, setInviando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [esitoImport, setEsitoImport] = useState(null); // testo di conferma
  const [erroreImport, setErroreImport] = useState(null);
  const fileInput = useRef(null);
  const [filtro, setFiltro] = useState(null); // etichetta categoria selezionata, null = tutte
  // Importazione da Apple Salute e divisione per tipo stanno dietro un
  // pulsante ad hamburger per lasciare più spazio alle statistiche.
  const [menuAperto, setMenuAperto] = useState(false);

  function load() {
    fetch("/api/workouts")
      .then((r) => r.json())
      .then((d) => setLog(d.log || []))
      .catch(() => setLog([]));
  }

  useEffect(() => {
    load();
  }, []);

  async function aggiungi(e) {
    e.preventDefault();
    if (!tipo.trim()) return;
    setInviando(true);
    try {
      const res = await fetch("/api/workouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: tipo.trim(), durataMinuti: Number(durata) || null, nota }),
      });
      const data = await res.json();
      setLog(data.log || []);
      setTipo("");
      setDurata("");
      setNota("");
    } finally {
      setInviando(false);
    }
  }

  async function elimina(id) {
    setLog((cur) => cur.filter((v) => v.id !== id));
    await fetch(`/api/workouts/${id}`, { method: "DELETE" }).catch(() => load());
  }

  async function importaApple(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportando(true);
    setErroreImport(null);
    setEsitoImport(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/salute/apple", { method: "POST", body: form });
      const dati = await res.json();
      if (!res.ok) throw new Error(dati.error || "Importazione fallita");
      setEsitoImport(`Importati ${dati.allenamentiNuovi} allenamenti e ${dati.pesiNuovi} pesi nuovi (nel file: ${dati.allenamentiTotali} allenamenti, ${dati.pesiTotali} pesi).`);
      load();
      window.dispatchEvent(new Event("salute:peso-aggiornato"));
    } catch (err) {
      setErroreImport(err.message);
    } finally {
      setImportando(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  if (log === null) {
    return (
      <section id="section-allenamenti" className="card span-2">
        <h3>Allenamenti</h3>
      </section>
    );
  }

  const statistichePerTipo = calcolaStatistichePerTipo(log);
  const categorie = calcolaCategorie(log);
  const logFiltrato = filtro ? log.filter((v) => etichettaSport(v.sport, v.tipo) === filtro) : log;

  return (
    <section id="section-allenamenti" className="card span-2">
      <div className="allenamenti-header">
        <h3>Allenamenti</h3>
        <button
          type="button"
          className={`allenamenti-menu-btn${menuAperto ? " aperto" : ""}`}
          onClick={() => setMenuAperto((v) => !v)}
          aria-label="Importa da Apple Salute e dividi per tipo"
          title="Importa da Apple Salute e dividi per tipo"
        >
          ☰
        </button>
      </div>

      <div className="allenamenti-stats-tipo">
        {statistichePerTipo.length === 0 ? (
          <p className="peso-hint">Nessun allenamento negli ultimi 7 giorni.</p>
        ) : (
          statistichePerTipo.map((s) => (
            <div key={s.etichetta} className="allenamenti-stat-tipo">
              <span className="allenamenti-stat-tipo-etichetta">{s.etichetta}</span>
              <span className="allenamenti-stat-tipo-numero">{s.numero}</span>
              <span className="allenamenti-stat-tipo-dettaglio">
                {s.minutiTotali} min{s.kmTotali ? ` · ${s.kmTotali} km` : ""}
              </span>
            </div>
          ))
        )}
      </div>

      {menuAperto && (
        <div className="strava-box">
          <p className="strava-hint">
            <b>Apple Salute</b> non si collega da un sito web: si importa il file che l&apos;app Salute
            esporta (iPhone → Salute → la tua foto in alto → &quot;Esporta tutti i dati sulla salute&quot; →
            <code>export.zip</code>). Qui dentro vengono letti allenamenti e peso; rifare l&apos;import non crea doppioni.
          </p>
          <div className="strava-azioni">
            <label className={`strava-connetti-btn${importando ? " disabilitato" : ""}`}>
              {importando ? "Importo…" : "Importa export.zip"}
              <input ref={fileInput} type="file" accept=".zip,.xml" onChange={importaApple} disabled={importando} style={{ display: "none" }} />
            </label>
          </div>
          {esitoImport && <p className="strava-esito strava-esito-ok">{esitoImport}</p>}
          {erroreImport && <p className="strava-errore">{erroreImport}</p>}

          {log.length > 0 && categorie.length > 1 && (
            <div className="allenamenti-categorie">
              <span className="allenamenti-categorie-label">Dividi per tipo:</span>
              <button
                type="button"
                className={`allenamenti-categoria-chip${filtro === null ? " selezionato" : ""}`}
                onClick={() => setFiltro(null)}
              >
                Tutti ({log.length})
              </button>
              {categorie.map(([etichetta, conteggio]) => (
                <button
                  key={etichetta}
                  type="button"
                  className={`allenamenti-categoria-chip${filtro === etichetta ? " selezionato" : ""}`}
                  onClick={() => setFiltro(filtro === etichetta ? null : etichetta)}
                >
                  {etichetta} ({conteggio})
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <form className="allenamenti-form" onSubmit={aggiungi}>
        <input type="text" placeholder="tipo (es. corsa, palestra)" value={tipo} onChange={(e) => setTipo(e.target.value)} disabled={inviando} />
        <input type="text" inputMode="numeric" placeholder="min" value={durata} onChange={(e) => setDurata(e.target.value)} disabled={inviando} style={{ width: 56 }} />
        <button type="submit" disabled={inviando}>Aggiungi</button>
      </form>
      <input
        type="text"
        placeholder="nota (facoltativa)"
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        disabled={inviando}
        className="allenamenti-nota"
      />

      {log.length === 0 ? (
        <p className="peso-hint">Nessun allenamento registrato ancora.</p>
      ) : (
        <div className="peso-lista">
          {logFiltrato.slice(0, 8).map((v) => (
            <div key={v.id} className="peso-riga">
              <span>{v.data}</span>
              <span className="peso-riga-kg">
                {v.fonte === "apple" && <span className="strava-badge">Apple</span>}
                {v.tipo}
                {v.durataMinuti ? ` · ${v.durataMinuti} min` : ""}
                {v.distanzaKm ? ` · ${v.distanzaKm} km` : ""}
                {v.nota ? ` · ${v.nota}` : ""}
              </span>
              <span className="peso-elimina" onClick={() => elimina(v.id)}>✕</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

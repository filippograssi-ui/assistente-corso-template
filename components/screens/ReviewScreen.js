"use client";

import { useEffect, useState } from "react";

function formatGeneratoIl(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function ReviewScreen() {
  const [dati, setDati] = useState(null);
  const [riassunto, setRiassunto] = useState(null);
  const [generatoIl, setGeneratoIl] = useState(null);
  const [caricamento, setCaricamento] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [errore, setErrore] = useState(null);

  useEffect(() => {
    fetch("/api/review")
      .then((r) => r.json())
      .then((data) => {
        setDati(data);
        if (data.ultimoRiassunto) {
          setRiassunto(data.ultimoRiassunto.testo);
          setGeneratoIl(data.ultimoRiassunto.generatoIl);
        }
        setCaricamento(false);
      })
      .catch(() => setCaricamento(false));
  }, []);

  async function generaRiassunto() {
    if (!dati) return;
    setGenerando(true);
    setErrore(null);
    try {
      const res = await fetch("/api/review/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completati: dati.completati,
          slittati: dati.slittati,
          personeSilenziose: dati.personeSilenziose,
          riepilogoAbitudini: dati.riepilogoAbitudini,
          riepilogoPasti: dati.riepilogoPasti,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrore(json.error || "Errore nella generazione del riassunto");
      } else {
        setRiassunto(json.testo);
        setGeneratoIl(json.generatoIl);
      }
    } catch {
      setErrore("Errore di rete durante la generazione del riassunto");
    } finally {
      setGenerando(false);
    }
  }

  if (caricamento) {
    return (
      <div className="screen-review">
        <section className="card">
          <p className="review-hint">Carico la settimana...</p>
        </section>
      </div>
    );
  }

  const completati = dati?.completati || [];
  const slittati = dati?.slittati || [];
  const personeSilenziose = dati?.personeSilenziose || [];
  const riepilogoAbitudini = dati?.riepilogoAbitudini || [];
  const riepilogoPasti = dati?.riepilogoPasti;

  return (
    <div className="screen-review">
      <section className="card review-summary-card">
        <div className="review-summary-header">
          <h3>Riassunto della settimana</h3>
          <button className="review-refresh" onClick={generaRiassunto} disabled={generando}>
            {generando ? "Genero..." : riassunto ? "Rigenera" : "Genera riassunto"}
          </button>
        </div>
        {errore && <p className="review-errore">{errore}</p>}
        {riassunto ? (
          <>
            <p className="review-summary-text">{riassunto}</p>
            {generatoIl && <p className="review-summary-meta">Generato il {formatGeneratoIl(generatoIl)}</p>}
          </>
        ) : (
          !errore && <p className="review-hint">Premi il pulsante per generare un breve briefing della settimana basato sui tuoi dati reali.</p>
        )}
      </section>

      <section className="card review-grid" style={{ background: "transparent", border: "none", boxShadow: "none", padding: 0 }}>
        <div className="card">
          <h3>Completato questa settimana</h3>
          {completati.length === 0 && <p className="review-hint">Nessun completamento negli ultimi 7 giorni.</p>}
          {completati.map((item) => (
            <div key={item.id} className="review-list-item">{item.titolo}</div>
          ))}
        </div>

        <div className="card">
          <h3>Slittato</h3>
          {slittati.length === 0 && <p className="review-hint">Niente in ritardo, bene così.</p>}
          {slittati.map((item) => (
            <div key={item.id} className="review-list-item">
              {item.titolo}
              {item.persona ? ` — ${item.persona}` : ""}
            </div>
          ))}
        </div>

        <div className="card">
          <h3>Persone silenziose</h3>
          {personeSilenziose.length === 0 && <p className="review-hint">Nessuno è rimasto in silenzio troppo a lungo.</p>}
          {personeSilenziose.map((p) => (
            <div key={p.persona} className="review-list-item">
              {p.persona} — {p.giorni}g ({p.titolo})
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <h3>Abitudini e alimentazione della settimana</h3>
        <div className="review-week-grid">
          <div className="review-week-col">
            {riepilogoAbitudini.length === 0 && <p className="review-hint">Nessuna abitudine configurata.</p>}
            {riepilogoAbitudini.map((h) => (
              <div key={h.nome} className="review-list-item">
                {h.nome} — {h.percentuale}%
              </div>
            ))}
          </div>
          <div className="review-week-col">
            {riepilogoPasti && riepilogoPasti.giorniRegistrati > 0 ? (
              <>
                <div className="review-list-item">Giorni con pasti registrati: {riepilogoPasti.giorniRegistrati}/7</div>
                <div className="review-list-item">Pasti totali: {riepilogoPasti.numeroPasti}</div>
                <div className="review-list-item">Calorie medie/giorno: {riepilogoPasti.calorieMedie}</div>
              </>
            ) : (
              <p className="review-hint">Nessun pasto registrato questa settimana.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

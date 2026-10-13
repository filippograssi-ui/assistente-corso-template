"use client";

import { useEffect, useState } from "react";

// Riassunto salute: si legge l'ultimo salvato (nessuna chiamata al modello
// all'apertura) e si rigenera solo premendo il pulsante.
export default function SaluteRiassuntoBar() {
  const [riassunto, setRiassunto] = useState(null);
  const [generando, setGenerando] = useState(false);
  const [errore, setErrore] = useState(null);

  useEffect(() => {
    fetch("/api/salute/riassunto")
      .then((r) => r.json())
      .then(setRiassunto)
      .catch(() => setRiassunto({ testo: null, generatoIl: null }));
  }, []);

  async function rigenera() {
    setGenerando(true);
    setErrore(null);
    try {
      const res = await fetch("/api/salute/riassunto", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Generazione fallita");
      setRiassunto(json);
    } catch (err) {
      setErrore(err.message);
    } finally {
      setGenerando(false);
    }
  }

  const testoPronto = riassunto && riassunto.testo;

  return (
    <section id="section-salute-riassunto" className="card span-4 aggiornamenti-bar-reale">
      <div className="aggiornamenti-bar-reale-header">
        <span className="aggiornamenti-titolo">Come sta andando</span>
        <button type="button" className="aggiornamenti-rigenera" onClick={rigenera} disabled={generando}>
          {generando ? "Sto scrivendo..." : testoPronto ? "Rigenera" : "Genera"}
        </button>
      </div>
      {riassunto === null ? null : testoPronto ? (
        <p className="aggiornamenti-testo-reale">{riassunto.testo}</p>
      ) : (
        <span className="aggiornamenti-sottotitolo">
          Premi &quot;Genera&quot; per un riassunto di abitudini, allenamenti, peso e alimentazione degli ultimi giorni.
        </span>
      )}
      {errore && <p className="review-errore">{errore}</p>}
    </section>
  );
}

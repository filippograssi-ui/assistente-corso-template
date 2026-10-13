"use client";

import { useEffect, useState } from "react";

function formattaQuando(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

// Riassunto del giorno — il testo arriva da /api/aggiornamenti: si legge
// quello salvato (nessuna chiamata al modello all'apertura) e si rigenera
// solo premendo "Rigenera". Il meteo è live, in base alla posizione del
// dispositivo (chiede il permesso la prima volta).
export default function AggiornamentiBar() {
  const [aggiornamenti, setAggiornamenti] = useState(null); // { testo, generatoIl } | null
  const [meteo, setMeteo] = useState(null);
  const [generando, setGenerando] = useState(false);
  const [errore, setErrore] = useState(null);

  useEffect(() => {
    fetch("/api/aggiornamenti")
      .then((r) => r.json())
      .then(setAggiornamenti)
      .catch(() => setAggiornamenti({ testo: null, generatoIl: null }));
  }, []);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setMeteo("negato");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (posizione) => {
        const { latitude, longitude } = posizione.coords;
        fetch(`/api/meteo?lat=${latitude}&lon=${longitude}`)
          .then((r) => r.json())
          .then((d) => setMeteo(d.disponibile ? d : "negato"))
          .catch(() => setMeteo("negato"));
      },
      () => setMeteo("negato"),
      { timeout: 8000, maximumAge: 30 * 60 * 1000 }
    );
  }, []);

  async function rigenera() {
    setGenerando(true);
    setErrore(null);
    try {
      const res = await fetch("/api/aggiornamenti", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Generazione fallita");
      setAggiornamenti(json);
    } catch (err) {
      setErrore(err.message);
    } finally {
      setGenerando(false);
    }
  }

  const testoPronto = aggiornamenti && aggiornamenti.testo;

  return (
    <section id="section-aggiornamenti" className="card span-4 aggiornamenti-bar-reale">
      <div className="aggiornamenti-bar-reale-header">
        <span className="aggiornamenti-titolo">Riassunto del giorno</span>
        <div className="aggiornamenti-azioni">
          {meteo && meteo !== "negato" && (
            <span className="aggiornamenti-meteo" title={meteo.descrizione}>
              {meteo.emoji} {meteo.temperatura}°
            </span>
          )}
          <button type="button" className="aggiornamenti-rigenera" onClick={rigenera} disabled={generando}>
            {generando ? "Sto scrivendo..." : testoPronto ? "Rigenera" : "Genera"}
          </button>
        </div>
      </div>

      {aggiornamenti === null ? null : testoPronto ? (
        <>
          <p className="aggiornamenti-testo-reale">{aggiornamenti.testo}</p>
          <span className="aggiornamenti-sottotitolo">Generato il {formattaQuando(aggiornamenti.generatoIl)}</span>
        </>
      ) : (
        <span className="aggiornamenti-sottotitolo">
          Nessun riassunto ancora: premi &quot;Genera&quot; per farlo scrivere dall&apos;assistente in base ai tuoi dati di oggi.
        </span>
      )}
      {errore && <p className="review-errore">{errore}</p>}
    </section>
  );
}

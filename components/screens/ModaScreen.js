"use client";

import { useEffect, useState } from "react";

function formattaQuando(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

// Trend di moda del momento, filtrati sulle preferenze scritte (stile,
// genere, budget, occasioni). Si genera premendo il pulsante.
export default function ModaScreen() {
  const [preferenze, setPreferenze] = useState(null);
  const [ultimo, setUltimo] = useState(null);
  const [generando, setGenerando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [errore, setErrore] = useState(null);

  useEffect(() => {
    fetch("/api/moda")
      .then((r) => r.json())
      .then((d) => {
        setPreferenze(d.preferenze || "");
        setUltimo(d.ultimo);
      })
      .catch(() => setPreferenze(""));
  }, []);

  async function salva() {
    setSalvando(true);
    try {
      await fetch("/api/moda", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ preferenze }) });
    } finally {
      setSalvando(false);
    }
  }

  async function genera() {
    setGenerando(true);
    setErrore(null);
    try {
      await salva();
      const res = await fetch("/api/moda", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Generazione fallita");
      setUltimo(json.ultimo);
    } catch (err) {
      setErrore(err.message);
    } finally {
      setGenerando(false);
    }
  }

  if (preferenze === null) return <div className="screen-svago"><section className="card span-4"><h3>Trend moda</h3></section></div>;

  return (
    <div className="screen-svago">
      <section className="card span-4">
        <h3>Il tuo stile</h3>
        <div className="svago-preferenze">
          <textarea
            rows={2}
            value={preferenze}
            onChange={(e) => setPreferenze(e.target.value)}
            onBlur={salva}
            placeholder="Es. donna, stile casual-elegante per andare a scuola, colori neutri, budget medio…"
          />
          {salvando && <span className="svago-preferenze-stato">Salvo...</span>}
        </div>
      </section>

      <section className="card span-4 rassegna">
        <div className="aggiornamenti-bar-reale-header">
          <h3 style={{ marginBottom: 0 }}>Trend del momento</h3>
          <button type="button" className="aggiornamenti-rigenera" onClick={genera} disabled={generando}>
            {generando ? "Cerco i trend..." : ultimo ? "Aggiorna" : "Genera"}
          </button>
        </div>
        {ultimo ? (
          <>
            <div className="rassegna-testo">
              {ultimo.testo.split(/\n+/).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            <span className="aggiornamenti-sottotitolo">Generato il {formattaQuando(ultimo.generatoIl)}</span>
          </>
        ) : (
          <p className="review-hint">Premi &quot;Genera&quot;: l&apos;assistente cerca sul web i trend di adesso e li filtra sul tuo stile.</p>
        )}
        {errore && <p className="review-errore">{errore}</p>}
      </section>
    </div>
  );
}

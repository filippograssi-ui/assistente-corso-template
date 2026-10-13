"use client";

import { useEffect, useState } from "react";

const SUGGERITI = ["Scuola e istruzione", "Intelligenza artificiale", "Politica italiana", "Esteri", "Scienza", "Cultura e libri", "Cinema e serie", "Sport", "Tecnologia", "Economia"];

function formattaQuando(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

// Notizie "intelligenti": solo sugli argomenti scelti. Gli argomenti si
// salvano da soli; la rassegna si genera premendo il pulsante (ricerca web
// + modello), mai all'apertura.
export default function NotizieScreen() {
  const [argomenti, setArgomenti] = useState(null);
  const [ultimo, setUltimo] = useState(null);
  const [nuovo, setNuovo] = useState("");
  const [generando, setGenerando] = useState(false);
  const [errore, setErrore] = useState(null);

  useEffect(() => {
    fetch("/api/notizie")
      .then((r) => r.json())
      .then((d) => {
        setArgomenti(d.argomenti || []);
        setUltimo(d.ultimo);
      })
      .catch(() => setArgomenti([]));
  }, []);

  async function salvaArgomenti(lista) {
    setArgomenti(lista);
    await fetch("/api/notizie", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ argomenti: lista }),
    });
  }

  function aggiungi(e) {
    e.preventDefault();
    const a = nuovo.trim();
    if (!a || argomenti.some((x) => x.toLowerCase() === a.toLowerCase())) return;
    setNuovo("");
    salvaArgomenti([...argomenti, a]);
  }

  function rimuovi(a) {
    salvaArgomenti(argomenti.filter((x) => x !== a));
  }

  function alternaSuggerito(a) {
    if (argomenti.includes(a)) rimuovi(a);
    else salvaArgomenti([...argomenti, a]);
  }

  async function genera() {
    setGenerando(true);
    setErrore(null);
    try {
      const res = await fetch("/api/notizie", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Generazione fallita");
      setUltimo(json.ultimo);
    } catch (err) {
      setErrore(err.message);
    } finally {
      setGenerando(false);
    }
  }

  if (argomenti === null) return <div className="screen-svago"><section className="card span-4"><h3>Notizie</h3></section></div>;

  return (
    <div className="screen-svago">
      <section className="card span-4">
        <h3>Di cosa vuoi avere notizie</h3>
        <div className="rassegna-chip">
          {SUGGERITI.map((a) => (
            <button key={a} type="button" className={`rassegna-chip-btn${argomenti.includes(a) ? " attivo" : ""}`} onClick={() => alternaSuggerito(a)}>
              {a}
            </button>
          ))}
        </div>
        <form onSubmit={aggiungi} className="scuola-todo-form" style={{ marginTop: 10 }}>
          <input type="text" value={nuovo} onChange={(e) => setNuovo(e.target.value)} placeholder="Un argomento tuo (es. Inter, Saronno, robotica educativa)" />
          <button type="submit">Aggiungi</button>
        </form>
        {argomenti.filter((a) => !SUGGERITI.includes(a)).length > 0 && (
          <div className="rassegna-chip" style={{ marginTop: 8 }}>
            {argomenti.filter((a) => !SUGGERITI.includes(a)).map((a) => (
              <button key={a} type="button" className="rassegna-chip-btn attivo" onClick={() => rimuovi(a)} title="Rimuovi">
                {a} ✕
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="card span-4 rassegna">
        <div className="aggiornamenti-bar-reale-header">
          <h3 style={{ marginBottom: 0 }}>La tua rassegna</h3>
          <button type="button" className="aggiornamenti-rigenera" onClick={genera} disabled={generando || argomenti.length === 0}>
            {generando ? "Cerco le notizie..." : ultimo ? "Aggiorna" : "Genera"}
          </button>
        </div>
        {argomenti.length === 0 && <p className="review-hint">Scegli almeno un argomento qui sopra.</p>}
        {ultimo ? (
          <>
            <div className="rassegna-testo">
              {ultimo.testo.split(/\n+/).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            <span className="aggiornamenti-sottotitolo">Generata il {formattaQuando(ultimo.generatoIl)} · {(ultimo.argomenti || []).join(", ")}</span>
          </>
        ) : (
          argomenti.length > 0 && <p className="review-hint">Nessuna rassegna ancora: premi &quot;Genera&quot;.</p>
        )}
        {errore && <p className="review-errore">{errore}</p>}
      </section>
    </div>
  );
}

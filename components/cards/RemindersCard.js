"use client";

import { useEffect, useState } from "react";

function formattaScadenza(scadenza) {
  if (!scadenza) return "";
  const d = new Date(scadenza.includes("T") ? scadenza : `${scadenza}T00:00:00`);
  const opzioni = scadenza.includes("T")
    ? { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }
    : { day: "numeric", month: "short" };
  return d.toLocaleString("it-IT", opzioni);
}

function scaduto(scadenza) {
  if (!scadenza) return false;
  const d = new Date(scadenza.includes("T") ? scadenza : `${scadenza}T23:59:59`);
  return d < new Date();
}

// Promemoria salvati nell'app: testo + data (e ora) facoltativa. Quelli
// scaduti si colorano di rosso; i fatti finiscono in fondo, sbiaditi.
export default function RemindersCard() {
  const [promemoria, setPromemoria] = useState(null);
  const [testo, setTesto] = useState("");
  const [scadenza, setScadenza] = useState("");
  const [inviando, setInviando] = useState(false);

  function load() {
    fetch("/api/promemoria")
      .then((r) => r.json())
      .then((d) => setPromemoria(d.promemoria || []))
      .catch(() => setPromemoria([]));
  }

  useEffect(load, []);

  async function aggiungi(e) {
    e.preventDefault();
    if (!testo.trim()) return;
    setInviando(true);
    try {
      const res = await fetch("/api/promemoria", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testo: testo.trim(), scadenza: scadenza || null }),
      });
      const json = await res.json();
      if (res.ok) {
        setPromemoria(json.promemoria);
        setTesto("");
        setScadenza("");
      }
    } finally {
      setInviando(false);
    }
  }

  async function alterna(id) {
    const res = await fetch(`/api/promemoria/${id}`, { method: "PATCH" });
    const json = await res.json();
    if (res.ok) setPromemoria(json.promemoria);
  }

  async function elimina(id) {
    const res = await fetch(`/api/promemoria/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (res.ok) setPromemoria(json.promemoria);
  }

  if (promemoria === null) {
    return (
      <section id="section-promemoria" className="card span-2">
        <h3>Promemoria</h3>
      </section>
    );
  }

  const aperti = promemoria.filter((p) => !p.fatto);
  const fatti = promemoria.filter((p) => p.fatto);

  return (
    <section id="section-promemoria" className="card span-2">
      <h3>Promemoria</h3>
      <form onSubmit={aggiungi} className="scuola-todo-form promemoria-form">
        <input type="text" value={testo} onChange={(e) => setTesto(e.target.value)} placeholder="Es. Portare le fotocopie" />
        <input type="datetime-local" value={scadenza} onChange={(e) => setScadenza(e.target.value)} />
        <button type="submit" disabled={inviando}>Aggiungi</button>
      </form>
      <div className="scuola-todo-list">
        {aperti.length === 0 && fatti.length === 0 && <p className="promemoria-hint">Nessun promemoria aperto.</p>}
        {aperti.map((p) => (
          <div key={p.id} className="scuola-todo-item">
            <input type="checkbox" checked={false} onChange={() => alterna(p.id)} />
            <span>
              {p.testo}
              {p.scadenza && (
                <span className={`svago-voce-tag${scaduto(p.scadenza) ? " promemoria-scaduto" : ""}`}>{formattaScadenza(p.scadenza)}</span>
              )}
            </span>
            <button type="button" className="scuola-todo-elimina" onClick={() => elimina(p.id)} aria-label="Elimina">✕</button>
          </div>
        ))}
        {fatti.length > 0 && (
          <>
            <div className="review-hint" style={{ marginTop: 10 }}>Fatti</div>
            {fatti.slice(0, 5).map((p) => (
              <div key={p.id} className="scuola-todo-item fatto">
                <input type="checkbox" checked={true} onChange={() => alterna(p.id)} />
                <span>{p.testo}</span>
                <button type="button" className="scuola-todo-elimina" onClick={() => elimina(p.id)} aria-label="Elimina">✕</button>
              </div>
            ))}
          </>
        )}
      </div>
    </section>
  );
}

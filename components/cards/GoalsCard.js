"use client";

import { useEffect, useState } from "react";

const SEZIONI = [
  { id: "settimana", label: "Questa settimana" },
  { id: "mese", label: "Questo mese" },
];

export default function GoalsCard() {
  const [obiettivi, setObiettivi] = useState(null); // { settimana: [], mese: [] }
  const [bozze, setBozze] = useState({ settimana: "", mese: "" });

  function load() {
    fetch("/api/goals")
      .then((r) => r.json())
      .then(setObiettivi)
      .catch(() => {});
  }

  useEffect(() => {
    load();
  }, []);

  function toggleFatto(id, fattoAttuale) {
    setObiettivi((cur) => {
      if (!cur) return cur;
      const next = { ...cur };
      for (const sezione of ["settimana", "mese"]) {
        next[sezione] = next[sezione].map((v) => (v.id === id ? { ...v, fatto: !fattoAttuale } : v));
      }
      return next;
    });
    fetch(`/api/goals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fatto: !fattoAttuale }),
    })
      .then((r) => r.json())
      .then((data) => setObiettivi(data))
      .catch(() => load());
  }

  function rimuovi(id) {
    setObiettivi((cur) => {
      if (!cur) return cur;
      const next = { ...cur };
      for (const sezione of ["settimana", "mese"]) {
        next[sezione] = next[sezione].filter((v) => v.id !== id);
      }
      return next;
    });
    fetch(`/api/goals/${id}`, { method: "DELETE" }).catch(() => load());
  }

  function aggiungi(sezione, e) {
    e.preventDefault();
    const testo = bozze[sezione].trim();
    if (!testo) return;
    setBozze((cur) => ({ ...cur, [sezione]: "" }));
    fetch("/api/goals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sezione, testo }),
    })
      .then((r) => r.json())
      .then((data) => setObiettivi(data))
      .catch(() => load());
  }

  if (!obiettivi) return (
    <section id="section-obiettivi" className="card span-2">
      <h3>Obiettivi</h3>
    </section>
  );

  return (
    <section id="section-obiettivi" className="card span-2">
      <h3>Obiettivi</h3>
      {SEZIONI.map(({ id: sezione, label }) => (
        <div className="goal-group" key={sezione}>
          <div className="goal-group-label">{label}</div>
          {(obiettivi[sezione] || []).map((v) => (
            <div className={`goal-row${v.fatto ? " done" : ""}`} key={v.id}>
              <span className="goal-check" onClick={() => toggleFatto(v.id, v.fatto)} />
              <span className="goal-text">{v.testo}</span>
              {v.progresso ? <span className="goal-progress">{v.progresso}</span> : null}
              <span className="goal-remove" onClick={() => rimuovi(v.id)} title="Rimuovi">✕</span>
            </div>
          ))}
          <form className="goal-add-row" onSubmit={(e) => aggiungi(sezione, e)}>
            <input
              type="text"
              placeholder="Aggiungi un obiettivo e premi Invio"
              value={bozze[sezione]}
              onChange={(e) => setBozze((cur) => ({ ...cur, [sezione]: e.target.value }))}
            />
          </form>
        </div>
      ))}
    </section>
  );
}

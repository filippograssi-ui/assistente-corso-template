"use client";

import { useEffect, useState } from "react";

// Le classi del docente, con il link al team/canale di Microsoft Teams di
// ciascuna (facoltativo) — usato nell'agenda del giorno come "Apri la
// classe su Teams". Nome e link si modificano cliccando sulla riga.
export default function ClassiCard() {
  const [classi, setClassi] = useState(null);
  const [nome, setNome] = useState("");
  const [teams, setTeams] = useState("");
  const [note, setNote] = useState("");
  const [inviando, setInviando] = useState(false);
  const [errore, setErrore] = useState(null);
  const [modificaId, setModificaId] = useState(null);
  const [bozza, setBozza] = useState({ nome: "", teams: "", note: "" });

  function carica() {
    fetch("/api/scuola/classi")
      .then((r) => r.json())
      .then((d) => setClassi(d.classi || []))
      .catch(() => setClassi([]));
  }

  useEffect(carica, []);

  function notifica() {
    window.dispatchEvent(new Event("scuola:classi-aggiornate"));
  }

  async function aggiungi(e) {
    e.preventDefault();
    if (!nome.trim()) return;
    setInviando(true);
    setErrore(null);
    try {
      const res = await fetch("/api/scuola/classi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: nome.trim(), teams: teams.trim(), note: note.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrore(json.error || "Aggiunta non riuscita");
      } else {
        setClassi(json.classi);
        setNome("");
        setTeams("");
        setNote("");
        notifica();
      }
    } finally {
      setInviando(false);
    }
  }

  async function salvaModifica(id) {
    const res = await fetch(`/api/scuola/classi/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bozza),
    });
    const json = await res.json();
    if (res.ok) {
      setClassi(json.classi);
      setModificaId(null);
      notifica();
    }
  }

  async function elimina(id) {
    const res = await fetch(`/api/scuola/classi/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (res.ok) {
      setClassi(json.classi);
      notifica();
    }
  }

  if (!classi) {
    return (
      <section id="section-scuola-classi" className="card span-2">
        <h3>Classi</h3>
      </section>
    );
  }

  return (
    <section id="section-scuola-classi" className="card span-2">
      <h3>Classi</h3>
      <div className="classi-lista">
        {classi.length === 0 && <p className="review-hint">Nessuna classe ancora: aggiungi le classi che hai quest&apos;anno (es. 4A, 2B).</p>}
        {classi.map((c) =>
          modificaId === c.id ? (
            <form
              key={c.id}
              className="classi-form"
              onSubmit={(e) => {
                e.preventDefault();
                salvaModifica(c.id);
              }}
            >
              <input type="text" value={bozza.nome} onChange={(e) => setBozza((b) => ({ ...b, nome: e.target.value }))} placeholder="Classe" />
              <input type="text" value={bozza.teams} onChange={(e) => setBozza((b) => ({ ...b, teams: e.target.value }))} placeholder="Link Teams (facoltativo)" />
              <input type="text" value={bozza.note} onChange={(e) => setBozza((b) => ({ ...b, note: e.target.value }))} placeholder="Nota (es. materia, aula)" />
              <div className="scuola-giorno-form-azioni">
                <button type="submit">Salva</button>
                <button type="button" onClick={() => setModificaId(null)}>Annulla</button>
              </div>
            </form>
          ) : (
            <div key={c.id} className="classi-riga">
              <button
                type="button"
                className="classi-nome"
                onClick={() => {
                  setModificaId(c.id);
                  setBozza({ nome: c.nome, teams: c.teams || "", note: c.note || "" });
                }}
                title="Modifica"
              >
                {c.nome}
              </button>
              <span className="classi-nota">{c.note}</span>
              {c.teams ? (
                <a href={c.teams} target="_blank" rel="noopener noreferrer" className="classi-teams">Teams ↗</a>
              ) : (
                <span className="classi-teams classi-teams-vuoto">nessun link Teams</span>
              )}
              <button type="button" className="scuola-todo-elimina" onClick={() => elimina(c.id)} aria-label="Elimina">✕</button>
            </div>
          )
        )}
      </div>

      <form onSubmit={aggiungi} className="classi-form">
        <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nuova classe (es. 4A)" />
        <input type="text" value={teams} onChange={(e) => setTeams(e.target.value)} placeholder="Link Teams della classe (facoltativo)" />
        <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nota (es. Matematica, aula 12)" />
        <button type="submit" disabled={inviando}>Aggiungi classe</button>
      </form>
      {errore && <p className="review-errore">{errore}</p>}
    </section>
  );
}

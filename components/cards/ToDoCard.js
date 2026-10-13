"use client";

import { useEffect, useState } from "react";
import TaskEditPanel from "../TaskEditPanel";

const FASCE = [
  { id: "in-ritardo", label: "In ritardo" },
  { id: "oggi", label: "Oggi" },
  { id: "settimana", label: "Questa settimana" },
  { id: "piu-avanti", label: "Più avanti" },
];
const RANK = { "in-ritardo": 0, oggi: 1, settimana: 2, "piu-avanti": 3 };

// La lista delle cose da fare: le stesse voci che crea anche la barra di
// cattura in fondo alla pagina ("ricordami di..."). Si aggiunge con una
// fascia (oggi / settimana / più avanti), si spunta, si apre per modificare.
export default function ToDoCard() {
  const [items, setItems] = useState(null);
  const [testo, setTesto] = useState("");
  const [fascia, setFascia] = useState("oggi");
  const [selectedId, setSelectedId] = useState(null);
  const [mostraFatti, setMostraFatti] = useState(false);

  useEffect(() => {
    carica();
  }, []);

  function carica() {
    fetch("/api/crm")
      .then((r) => r.json())
      .then((data) => setItems(data.crm || []))
      .catch(() => setItems([]));
  }

  async function aggiungi(e) {
    e.preventDefault();
    const titolo = testo.trim();
    if (!titolo) return;
    setTesto("");
    const res = await fetch("/api/crm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titolo, fascia }),
    });
    if (res.ok) carica();
  }

  async function saveItem(id, patch) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    await fetch(`/api/crm/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).catch(() => carica());
  }

  async function completeItem(id) {
    setSelectedId(null);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, dataCompletamento: new Date().toISOString() } : i)));
    await fetch(`/api/crm/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completato: true }),
    }).catch(() => carica());
  }

  async function riapri(id) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, dataCompletamento: null } : i)));
    await fetch(`/api/crm/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completato: false }),
    }).catch(() => carica());
  }

  async function deleteItem(id) {
    setSelectedId(null);
    setItems((prev) => prev.filter((i) => i.id !== id));
    await fetch(`/api/crm/${id}`, { method: "DELETE" }).catch(() => carica());
  }

  if (!items) {
    return (
      <section id="section-todo" className="card span-2">
        <h3>Da fare</h3>
      </section>
    );
  }

  const aperti = items
    .filter((i) => !i.dataCompletamento)
    .sort((a, b) => (RANK[a.fascia] ?? 9) - (RANK[b.fascia] ?? 9) || (a.posizione ?? 0) - (b.posizione ?? 0));
  const fatti = items.filter((i) => i.dataCompletamento).sort((a, b) => (a.dataCompletamento < b.dataCompletamento ? 1 : -1));
  const selected = items.find((i) => i.id === selectedId) || null;

  return (
    <section id="section-todo" className="card span-2">
      <h3>Da fare</h3>
      <form onSubmit={aggiungi} className="scuola-todo-form todo-form">
        <input type="text" value={testo} onChange={(e) => setTesto(e.target.value)} placeholder="Es. Preparare la verifica di giovedì" />
        <select value={fascia} onChange={(e) => setFascia(e.target.value)}>
          {FASCE.filter((f) => f.id !== "in-ritardo").map((f) => (
            <option key={f.id} value={f.id}>{f.label}</option>
          ))}
        </select>
        <button type="submit">Aggiungi</button>
      </form>

      <div className="scuola-todo-list">
        {aperti.length === 0 && <p className="review-hint">Niente da fare, per ora.</p>}
        {aperti.map((t) => (
          <div key={t.id} className="scuola-todo-item todo-item">
            <input type="checkbox" checked={false} onChange={() => completeItem(t.id)} />
            <span style={{ cursor: "pointer" }} onClick={() => setSelectedId(t.id)} title="Apri per modificare">
              <span className={`dot ${t.fascia === "in-ritardo" ? "late" : t.fascia === "oggi" ? "today" : "later"}`} />
              {t.titolo}
              <span className="svago-voce-tag">{FASCE.find((f) => f.id === t.fascia)?.label || t.fascia}</span>
            </span>
            <button type="button" className="scuola-todo-elimina" onClick={() => deleteItem(t.id)} aria-label="Elimina">✕</button>
          </div>
        ))}
        {fatti.length > 0 && (
          <>
            <button type="button" className="todo-mostra-fatti" onClick={() => setMostraFatti((v) => !v)}>
              {mostraFatti ? "Nascondi" : "Mostra"} completate ({fatti.length})
            </button>
            {mostraFatti &&
              fatti.slice(0, 10).map((t) => (
                <div key={t.id} className="scuola-todo-item fatto">
                  <input type="checkbox" checked={true} onChange={() => riapri(t.id)} />
                  <span>{t.titolo}</span>
                  <button type="button" className="scuola-todo-elimina" onClick={() => deleteItem(t.id)} aria-label="Elimina">✕</button>
                </div>
              ))}
          </>
        )}
      </div>

      <TaskEditPanel item={selected} onSave={saveItem} onComplete={completeItem} onDelete={deleteItem} onClose={() => setSelectedId(null)} />
    </section>
  );
}

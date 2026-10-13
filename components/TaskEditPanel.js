"use client";

import { useEffect } from "react";

const FASCE = [
  { id: "in-ritardo", label: "In ritardo" },
  { id: "oggi", label: "Oggi" },
  { id: "settimana", label: "Questa settimana" },
  { id: "piu-avanti", label: "Più avanti" },
];

// Pannello di modifica di un task/persona del CRM. Estratto dalla vecchia schermata
// CRM (ora tolta dal menu) così può essere aperto anche dall'anteprima in Home.
export default function TaskEditPanel({ item, onSave, onComplete, onDelete, onClose }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!item) return null;

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.2)", display: "flex", justifyContent: "flex-end", zIndex: 50 }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{ width: 360, maxWidth: "100%", height: "100%", borderRadius: 0, overflowY: "auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3>Modifica</h3>
        <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Titolo</label>
        <input
          style={{ width: "100%", padding: 8, border: "1px solid var(--border)", borderRadius: 8, marginBottom: 12, fontFamily: "inherit" }}
          value={item.titolo}
          onChange={(e) => onSave(item.id, { titolo: e.target.value })}
        />
        <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Nota</label>
        <textarea
          style={{ width: "100%", padding: 8, border: "1px solid var(--border)", borderRadius: 8, marginBottom: 12, fontFamily: "inherit", minHeight: 60 }}
          value={item.nota || ""}
          onChange={(e) => onSave(item.id, { nota: e.target.value })}
        />
        <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Fascia</label>
        <select
          style={{ width: "100%", padding: 8, border: "1px solid var(--border)", borderRadius: 8, marginBottom: 12 }}
          value={item.fascia}
          onChange={(e) => onSave(item.id, { fascia: e.target.value })}
        >
          {FASCE.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
        <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Temperatura</label>
        <select
          style={{ width: "100%", padding: 8, border: "1px solid var(--border)", borderRadius: 8, marginBottom: 12 }}
          value={item.temperatura}
          onChange={(e) => onSave(item.id, { temperatura: e.target.value })}
        >
          <option value="caldo">Caldo</option>
          <option value="tiepido">Tiepido</option>
          <option value="freddo">Freddo</option>
        </select>
        <label style={{ display: "block", fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>Persona</label>
        <input
          style={{ width: "100%", padding: 8, border: "1px solid var(--border)", borderRadius: 8, marginBottom: 20 }}
          value={item.persona || ""}
          onChange={(e) => onSave(item.id, { persona: e.target.value || null })}
        />
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            style={{ flex: 1, padding: 10, borderRadius: 8, border: "none", background: "var(--green)", color: "#fff", fontWeight: 700, cursor: "pointer" }}
            onClick={() => onComplete(item.id)}
          >
            Completa
          </button>
          <button
            type="button"
            style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid var(--red)", background: "var(--red-soft)", color: "var(--red)", fontWeight: 700, cursor: "pointer" }}
            onClick={() => onDelete(item.id)}
          >
            Elimina
          </button>
        </div>
      </div>
    </div>
  );
}

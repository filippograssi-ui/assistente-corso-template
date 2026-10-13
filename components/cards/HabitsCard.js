"use client";

import { useEffect, useState } from "react";
import { TAVOLOZZA } from "@/lib/color-palette";

// Anelli concentrici in stile Apple Fitness: un anello per abitudine invece di un
// unico anello aggregato. Il passo tra un anello e l'altro si calcola in base a
// quante abitudini ci sono, così ogni abitudine ha SEMPRE il suo anello visibile,
// qualunque sia il numero di abitudini configurate.
const STROKE = 7;
const RAGGIO_ESTERNO = 34;
const RAGGIO_MINIMO = 9;
const PASSO_MASSIMO = STROKE + 2;
// Colori automatici usati quando l'abitudine non ha un colore scelto a mano.
const COLORI_AUTO = ["var(--green)", "var(--orange)", "var(--accent)", "var(--red)", "#8e44ad", "#16a085"];
const DIMENSIONE = (RAGGIO_ESTERNO + STROKE) * 2 + 4;
const CENTRO = DIMENSIONE / 2;

// Distanza tra i centri di due anelli consecutivi: mai più larga di PASSO_MASSIMO
// (per non fare anelli troppo distanziati quando ce ne sono pochi), ma abbastanza
// stretta da far stare tutte le abitudini tra RAGGIO_ESTERNO e RAGGIO_MINIMO.
function calcolaPasso(numeroAbitudini) {
  if (numeroAbitudini <= 1) return 0;
  const spazioDisponibile = RAGGIO_ESTERNO - RAGGIO_MINIMO;
  return Math.min(PASSO_MASSIMO, spazioDisponibile / (numeroAbitudini - 1));
}

// Spessore del tratto: si restringe se il passo è troppo stretto per lo spessore
// nominale, così gli anelli non si sovrappongono quando le abitudini sono tante.
function calcolaSpessore(passo) {
  if (passo === 0) return STROKE;
  return Math.max(3, Math.min(STROKE, passo - 1));
}

function percentualeAbitudine(h, valore) {
  if (h.tipo === "spunta") return valore ? 100 : 0;
  const obiettivo = h.obiettivo || 1;
  return Math.min(100, Math.round(((valore || 0) / obiettivo) * 100));
}

// Colore effettivo di un'abitudine: quello scelto a mano se c'è, altrimenti
// il colore automatico ciclico in base alla posizione.
function coloreAbitudine(h, i) {
  return h.colore || COLORI_AUTO[i % COLORI_AUTO.length];
}

export default function HabitsCard() {
  const [data, setData] = useState(null); // { abitudini, log, completamento }
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState("spunta");
  const [obiettivo, setObiettivo] = useState("");
  const [nuovoColore, setNuovoColore] = useState(null);
  const [aggiungendo, setAggiungendo] = useState(false);
  const [mostraForm, setMostraForm] = useState(false);
  const [modificaColoreId, setModificaColoreId] = useState(null);

  function carica() {
    fetch("/api/habits").then((r) => r.json()).then(setData);
  }

  useEffect(carica, []);

  async function handleClick(habitId) {
    if (!data) return;
    // Aggiornamento ottimistico: la vista cambia subito, la scrittura parte dietro.
    const habit = data.abitudini.find((h) => h.id === habitId);
    const precedente = data.log[habitId];
    const ottimistico = { ...data.log };
    if (habit.tipo === "spunta") {
      ottimistico[habitId] = !precedente;
    } else {
      const obiettivo = habit.obiettivo || 1;
      ottimistico[habitId] = (precedente || 0) >= obiettivo ? 0 : (precedente || 0) + 1;
    }
    setData((d) => ({ ...d, log: ottimistico }));

    try {
      const res = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habitId }),
      });
      if (!res.ok) throw new Error("scrittura fallita");
      const fresh = await res.json();
      setData((d) => ({ ...d, log: fresh.log, completamento: fresh.completamento }));
    } catch {
      // Se la scrittura fallisce, si rilegge lo stato vero dal server.
      const fresh = await fetch("/api/habits").then((r) => r.json());
      setData(fresh);
    }
  }

  async function aggiungiAbitudine(e) {
    e.preventDefault();
    const nomePulito = nome.trim();
    if (!nomePulito) return;
    setAggiungendo(true);
    try {
      const res = await fetch("/api/habits/definizioni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nomePulito,
          tipo,
          obiettivo: tipo === "contatore" ? Number(obiettivo) || 1 : undefined,
          colore: nuovoColore || undefined,
        }),
      });
      if (res.ok) {
        setNome("");
        setObiettivo("");
        setNuovoColore(null);
        setMostraForm(false);
        carica();
      }
    } finally {
      setAggiungendo(false);
    }
  }

  async function eliminaAbitudine(habitId) {
    await fetch(`/api/habits/definizioni/${habitId}`, { method: "DELETE" });
    carica();
  }

  async function cambiaColoreAbitudine(habitId, colore) {
    setModificaColoreId(null);
    // Aggiornamento ottimistico anche qui, così il pallino cambia subito.
    setData((d) => ({
      ...d,
      abitudini: d.abitudini.map((h) => (h.id === habitId ? { ...h, colore } : h)),
    }));
    await fetch(`/api/habits/definizioni/${habitId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ colore }),
    });
    carica();
  }

  if (!data) {
    return (
      <section id="section-abitudini" className="card span-2">
        <h3>Abitudini</h3>
      </section>
    );
  }

  const passo = calcolaPasso(data.abitudini.length);
  const spessore = calcolaSpessore(passo);

  return (
    <section id="section-abitudini" className="card span-2">
      <div className="abitudini-header">
        <h3 style={{ marginBottom: 0 }}>Abitudini</h3>
        <button type="button" className="abitudini-aggiungi-btn" onClick={() => setMostraForm((v) => !v)}>
          {mostraForm ? "Annulla" : "+ Aggiungi"}
        </button>
      </div>

      {mostraForm && (
        <form onSubmit={aggiungiAbitudine} className="abitudini-form">
          <input
            type="text"
            placeholder="Nome (es. Meditazione)"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="spunta">Spunta (fatto/non fatto)</option>
            <option value="contatore">Contatore (con obiettivo)</option>
          </select>
          {tipo === "contatore" && (
            <input
              type="number"
              min="1"
              placeholder="Obiettivo"
              value={obiettivo}
              onChange={(e) => setObiettivo(e.target.value)}
            />
          )}
          <div className="abitudini-colori">
            {TAVOLOZZA.map((c) => (
              <button
                type="button"
                key={c.colore}
                className={`abitudini-colore-swatch${nuovoColore === c.colore ? " selezionato" : ""}`}
                style={{ background: c.colore }}
                title={c.nome}
                onClick={() => setNuovoColore(nuovoColore === c.colore ? null : c.colore)}
                aria-label={c.nome}
              />
            ))}
            <span className="abitudini-colore-hint">{nuovoColore ? "" : "colore automatico"}</span>
          </div>
          <button type="submit" disabled={aggiungendo}>Salva</button>
        </form>
      )}

      <div className="abitudini-body">
      <div className="ring-wrap">
        <svg width={DIMENSIONE} height={DIMENSIONE} viewBox={`0 0 ${DIMENSIONE} ${DIMENSIONE}`}>
          {data.abitudini.map((h, i) => {
            const r = RAGGIO_ESTERNO - i * passo;
            const circonferenza = 2 * Math.PI * r;
            const pct = percentualeAbitudine(h, data.log[h.id]);
            const offset = circonferenza - (circonferenza * pct) / 100;
            return (
              <g key={h.id}>
                <circle cx={CENTRO} cy={CENTRO} r={r} fill="none" stroke="var(--border)" strokeWidth={spessore} />
                <circle
                  cx={CENTRO} cy={CENTRO} r={r} fill="none" stroke={coloreAbitudine(h, i)} strokeWidth={spessore}
                  strokeDasharray={circonferenza} strokeDashoffset={offset} strokeLinecap="round"
                  transform={`rotate(-90 ${CENTRO} ${CENTRO})`}
                />
              </g>
            );
          })}
        </svg>
        <div className="ring-label">{data.completamento}% oggi</div>
      </div>
      <div className="habit-list">
        {data.abitudini.map((h, i) => {
          const valore = data.log[h.id];
          const fatto = h.tipo === "spunta" ? Boolean(valore) : (valore || 0) >= (h.obiettivo || 1);
          const coloreCorrente = coloreAbitudine(h, i);
          return (
            <div key={h.id} className={`habit-row${fatto ? " done" : ""}`}>
              <button
                type="button"
                className="habit-dot"
                style={{ background: coloreCorrente }}
                onClick={() => setModificaColoreId(modificaColoreId === h.id ? null : h.id)}
                aria-label={`Cambia colore di ${h.nome}`}
                title="Cambia colore"
              />
              <span className="habit-name" style={{ cursor: "pointer" }} onClick={() => handleClick(h.id)}>{h.nome}</span>
              <span className="habit-value" style={{ cursor: "pointer" }} onClick={() => handleClick(h.id)}>
                {h.tipo === "spunta" ? (fatto ? "fatto" : "da fare") : `${valore || 0} / ${h.obiettivo}`}
              </span>
              <button
                type="button"
                className="abitudini-elimina"
                onClick={() => eliminaAbitudine(h.id)}
                aria-label={`Elimina ${h.nome}`}
              >
                ✕
              </button>
              {modificaColoreId === h.id && (
                <div className="abitudini-colori abitudini-colori-inline">
                  {TAVOLOZZA.map((c) => (
                    <button
                      type="button"
                      key={c.colore}
                      className={`abitudini-colore-swatch${coloreCorrente === c.colore ? " selezionato" : ""}`}
                      style={{ background: c.colore }}
                      title={c.nome}
                      onClick={() => cambiaColoreAbitudine(h.id, c.colore)}
                      aria-label={c.nome}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {data.abitudini.length === 0 && (
          <div style={{ color: "var(--text-faint)", fontSize: 12 }}>
            Nessuna abitudine configurata — aggiungine una con "+ Aggiungi".
          </div>
        )}
      </div>
      </div>
    </section>
  );
}

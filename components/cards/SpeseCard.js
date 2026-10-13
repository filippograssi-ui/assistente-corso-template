"use client";

import { useEffect, useState } from "react";

function euro(n) {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n || 0);
}

function meseDi(data) {
  return (data || "").slice(0, 7);
}

export default function SpeseCard() {
  const [spese, setSpese] = useState(null);
  const [categorie, setCategorie] = useState([]);
  const [descrizione, setDescrizione] = useState("");
  const [importo, setImporto] = useState("");
  const [categoria, setCategoria] = useState("Altro");
  const [data, setData] = useState("");
  const [inviando, setInviando] = useState(false);
  const [errore, setErrore] = useState(null);

  function load() {
    fetch("/api/finanze/spese")
      .then((r) => r.json())
      .then((d) => {
        setSpese(d.spese || []);
        setCategorie(d.categorie || []);
      })
      .catch(() => setSpese([]));
  }

  useEffect(() => {
    load();
    setData(new Date().toISOString().slice(0, 10));
  }, []);

  async function aggiungi(e) {
    e.preventDefault();
    setErrore(null);
    setInviando(true);
    try {
      const res = await fetch("/api/finanze/spese", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ descrizione, importo, categoria, data }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrore(json.error || "Aggiunta non riuscita");
      } else {
        setSpese(json.spese);
        setDescrizione("");
        setImporto("");
      }
    } finally {
      setInviando(false);
    }
  }

  async function elimina(id) {
    setSpese((cur) => cur.filter((v) => v.id !== id));
    await fetch(`/api/finanze/spese/${id}`, { method: "DELETE" }).catch(load);
  }

  if (spese === null) {
    return (
      <section id="section-spese" className="card">
        <h3>Spese</h3>
      </section>
    );
  }

  const meseCorrente = new Date().toISOString().slice(0, 7);
  const delMese = spese.filter((v) => meseDi(v.data) === meseCorrente);
  const totaleMese = delMese.reduce((s, v) => s + v.importo, 0);
  const perCategoria = new Map();
  for (const v of delMese) perCategoria.set(v.categoria, (perCategoria.get(v.categoria) || 0) + v.importo);
  const categorieOrdinate = [...perCategoria.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <section id="section-spese" className="card">
      <h3>Spese — {new Date().toLocaleDateString("it-IT", { month: "long", year: "numeric" })}</h3>
      <div className="spese-totali">
        <div className="peso-stat">
          <span className="peso-stat-val">{euro(totaleMese)}</span>
          <span className="peso-stat-label">speso questo mese</span>
        </div>
        {categorieOrdinate.slice(0, 4).map(([cat, tot]) => (
          <div key={cat} className="peso-stat">
            <span className="peso-stat-val">{euro(tot)}</span>
            <span className="peso-stat-label">{cat}</span>
          </div>
        ))}
      </div>

      <form onSubmit={aggiungi} className="spese-form">
        <input type="text" value={descrizione} onChange={(e) => setDescrizione(e.target.value)} placeholder="Cosa hai comprato" />
        <input type="text" inputMode="decimal" value={importo} onChange={(e) => setImporto(e.target.value)} placeholder="€" style={{ width: 90 }} />
        <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
          {categorie.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
        <button type="submit" disabled={inviando}>Aggiungi</button>
      </form>
      {errore && <p className="review-errore">{errore}</p>}

      {spese.length === 0 ? (
        <p className="review-hint">Nessuna spesa registrata.</p>
      ) : (
        <div className="peso-lista">
          {spese.slice(0, 30).map((v) => (
            <div key={v.id} className="peso-riga spese-riga">
              <span>{v.data}</span>
              <span className="spese-desc">{v.descrizione} <span className="svago-voce-tag">{v.categoria}</span></span>
              <span className="peso-riga-kg">{euro(v.importo)}</span>
              <span className="peso-elimina" onClick={() => elimina(v.id)}>✕</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

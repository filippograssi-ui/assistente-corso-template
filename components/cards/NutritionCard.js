"use client";

import { useEffect, useRef, useState } from "react";
import { caloriesFromMacros } from "@/lib/nutrition";

// Una riga vuota di partenza per il form "aggiungi pasto": alimento + quantità.
function rigaVuota() {
  return { alimento: "", quantita: "" };
}

// Combina le righe alimento/quantità in un'unica descrizione da mandare al
// modello, tipo "Pasta 80g, Pollo 150g, Olio 10g" — più precisa di una frase
// libera perché ogni alimento porta con sé la sua quantità.
function componiDescrizionePasto(righe) {
  return righe
    .map((r) => ({ alimento: r.alimento.trim(), quantita: r.quantita.trim() }))
    .filter((r) => r.alimento)
    .map((r) => (r.quantita ? `${r.alimento} ${r.quantita}` : r.alimento))
    .join(", ");
}

export default function NutritionCard() {
  const [data, setData] = useState(null); // { pasti, obiettivoCalorico }
  const [ingredienti, setIngredienti] = useState([rigaVuota()]);
  const [inviando, setInviando] = useState(false);
  const [apertoId, setApertoId] = useState(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const d = await fetch("/api/nutrition").then((r) => r.json());
    setData(d);
  }

  function aggiornaIngrediente(indice, campo, valore) {
    setIngredienti((cur) => cur.map((r, i) => (i === indice ? { ...r, [campo]: valore } : r)));
  }

  function aggiungiRigaIngrediente() {
    setIngredienti((cur) => [...cur, rigaVuota()]);
  }

  function rimuoviRigaIngrediente(indice) {
    setIngredienti((cur) => (cur.length > 1 ? cur.filter((_, i) => i !== indice) : cur));
  }

  async function aggiungiPasto(e) {
    e.preventDefault();
    const descrizione = componiDescrizionePasto(ingredienti);
    if (!descrizione) return;
    setInviando(true);
    const pasto = await fetch("/api/nutrition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ descrizione }),
    }).then((r) => r.json());
    setData((d) => ({ ...d, pasti: [...d.pasti, pasto] }));
    setIngredienti([rigaVuota()]);
    setInviando(false);
  }

  async function elimina(id) {
    setData((d) => ({ ...d, pasti: d.pasti.filter((p) => p.id !== id) }));
    if (apertoId === id) setApertoId(null);
    await fetch(`/api/nutrition/${id}`, { method: "DELETE" }).catch(() => load());
  }

  // Cambi un macro → le calorie si ricalcolano con la formula, all'istante, senza chiamate.
  function aggiornaMacroLocale(id, campo, valore) {
    setData((d) => ({
      ...d,
      pasti: d.pasti.map((p) => {
        if (p.id !== id) return p;
        const aggiornato = { ...p, [campo]: valore, stimato: false };
        aggiornato.calorie = caloriesFromMacros(aggiornato.proteine, aggiornato.carboidrati, aggiornato.grassi);
        return aggiornato;
      }),
    }));
  }

  function persistiMacro(id) {
    const pasto = data.pasti.find((p) => p.id === id);
    fetch(`/api/nutrition/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        proteine: pasto.proteine,
        carboidrati: pasto.carboidrati,
        grassi: pasto.grassi,
        calorie: pasto.calorie,
        stimato: false,
      }),
    });
  }

  // Cambi le calorie → parte, solo a digitazione conclusa, la ridistribuzione dei macro.
  function aggiornaCalorieLocale(id, valore) {
    setData((d) => ({ ...d, pasti: d.pasti.map((p) => (p.id === id ? { ...p, calorie: valore } : p)) }));
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const aggiornato = await fetch(`/api/nutrition/${id}/redistribute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calorie: valore }),
      }).then((r) => r.json());
      setData((d) => ({ ...d, pasti: d.pasti.map((p) => (p.id === id ? aggiornato : p)) }));
    }, 700);
  }

  if (!data) {
    return (
      <section id="section-nutrizione" className="card span-2">
        <h3>Nutrizione</h3>
      </section>
    );
  }

  const totali = data.pasti.reduce(
    (acc, p) => ({
      calorie: acc.calorie + p.calorie,
      proteine: acc.proteine + p.proteine,
      carboidrati: acc.carboidrati + p.carboidrati,
      grassi: acc.grassi + p.grassi,
    }),
    { calorie: 0, proteine: 0, carboidrati: 0, grassi: 0 }
  );

  return (
    <section id="section-nutrizione" className="card span-2">
      <h3>Nutrizione</h3>
      <form onSubmit={aggiungiPasto} style={{ marginBottom: 12 }}>
        <div className="pasto-ingredienti">
          {ingredienti.map((riga, i) => (
            <div className="pasto-ingrediente-riga" key={i}>
              <input
                type="text"
                placeholder="alimento (es. pasta, pollo)"
                value={riga.alimento}
                onChange={(e) => aggiornaIngrediente(i, "alimento", e.target.value)}
                disabled={inviando}
                className="pasto-ingrediente-alimento"
              />
              <input
                type="text"
                placeholder="quantità (es. 80g)"
                value={riga.quantita}
                onChange={(e) => aggiornaIngrediente(i, "quantita", e.target.value)}
                disabled={inviando}
                className="pasto-ingrediente-quantita"
              />
              {ingredienti.length > 1 && (
                <span className="pasto-ingrediente-rimuovi" onClick={() => rimuoviRigaIngrediente(i)}>✕</span>
              )}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
          <button type="button" className="pasto-aggiungi-alimento" onClick={aggiungiRigaIngrediente} disabled={inviando}>
            + alimento
          </button>
          <button
            type="submit"
            disabled={inviando}
            style={{ marginLeft: "auto", padding: "8px 14px", borderRadius: 8, border: "none", background: "var(--accent)", color: "#fff", fontWeight: 700, cursor: "pointer" }}
          >
            {inviando ? "…" : "Aggiungi pasto"}
          </button>
        </div>
      </form>

      <div className="kcal-row">
        <div className="kcal-main">{totali.calorie.toLocaleString("it-IT")} kcal</div>
        <div className="kcal-goal">obiettivo {data.obiettivoCalorico.toLocaleString("it-IT")}</div>
      </div>
      <div className="macro-row"><span className="macro-name">Proteine</span><div className="macro-bar-bg"><div className="macro-bar-fill" style={{ width: `${Math.min(100, (totali.proteine / 150) * 100)}%`, background: "var(--green)" }} /></div><span className="macro-value">{totali.proteine} g</span></div>
      <div className="macro-row"><span className="macro-name">Carboidrati</span><div className="macro-bar-bg"><div className="macro-bar-fill" style={{ width: `${Math.min(100, (totali.carboidrati / 250) * 100)}%` }} /></div><span className="macro-value">{totali.carboidrati} g</span></div>
      <div className="macro-row"><span className="macro-name">Grassi</span><div className="macro-bar-bg"><div className="macro-bar-fill" style={{ width: `${Math.min(100, (totali.grassi / 80) * 100)}%`, background: "var(--orange)" }} /></div><span className="macro-value">{totali.grassi} g</span></div>

      <div style={{ marginTop: 12 }}>
        {data.pasti.length === 0 && <div style={{ color: "var(--text-faint)", fontSize: 12 }}>Nessun pasto registrato oggi.</div>}
        {data.pasti.map((p) => (
          <div key={p.id} className="pasto-riga" style={{ borderTop: "1px solid var(--border)", padding: "8px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, cursor: "pointer", flex: 1, minWidth: 0 }} onClick={() => setApertoId(apertoId === p.id ? null : p.id)}>
                {p.nome} {p.stimato && <span style={{ color: "var(--text-faint)", fontSize: 11 }}>(stima)</span>}
                {p.nonStimato && (
                  <span style={{ color: "var(--red)", fontSize: 11 }}>
                    {" "}— inserisci i valori a mano{p.erroreStima ? ` (${p.erroreStima})` : ""}
                  </span>
                )}
              </span>
              <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600, cursor: "pointer", flexShrink: 0 }} onClick={() => setApertoId(apertoId === p.id ? null : p.id)}>
                {p.calorie} kcal
              </span>
              <span className="pasto-elimina" onClick={() => elimina(p.id)}>✕</span>
            </div>
            {apertoId === p.id && (
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                {["proteine", "carboidrati", "grassi"].map((campo) => (
                  <label key={campo} style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {campo}
                    <input
                      type="number"
                      value={p[campo]}
                      onChange={(e) => aggiornaMacroLocale(p.id, campo, Number(e.target.value) || 0)}
                      onBlur={() => persistiMacro(p.id)}
                      style={{ width: 60, marginLeft: 4, padding: 4, border: "1px solid var(--border)", borderRadius: 6 }}
                    />
                  </label>
                ))}
                <label style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  calorie
                  <input
                    type="number"
                    value={p.calorie}
                    onChange={(e) => aggiornaCalorieLocale(p.id, Number(e.target.value) || 0)}
                    style={{ width: 70, marginLeft: 4, padding: 4, border: "1px solid var(--border)", borderRadius: 6 }}
                  />
                </label>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";
import MateriaSelect from "./MateriaSelect";

// Niente sabato: su richiesta esplicita di Filippo l'orario copre solo lun-ven.
const GIORNI = [
  { chiave: "lun", nome: "Lunedì" },
  { chiave: "mar", nome: "Martedì" },
  { chiave: "mer", nome: "Mercoledì" },
  { chiave: "gio", nome: "Giovedì" },
  { chiave: "ven", nome: "Venerdì" },
];

function ridimensiona(griglia, ore) {
  const nuova = {};
  for (const { chiave } of GIORNI) {
    const riga = griglia[chiave] || [];
    nuova[chiave] = Array.from({ length: ore }, (_, i) => riga[i] || "");
  }
  return nuova;
}

// Orario scolastico settimanale, sotto l'agenda compiti/verifiche: una griglia
// ore × giorni che si compila con le stesse materie dell'agenda (o una scritta
// a mano) e si salva tutta insieme con un pulsante, non cella per cella.
export default function OrarioScolasticoCard() {
  const [ore, setOre] = useState(null);
  const [griglia, setGriglia] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [salvato, setSalvato] = useState(false);

  useEffect(() => {
    fetch("/api/scuola/orario")
      .then((r) => r.json())
      .then((d) => {
        setOre(d.orario?.ore || 6);
        setGriglia(d.orario?.griglia || {});
      })
      .catch(() => {
        setOre(6);
        setGriglia({});
      });
  }, []);

  function cambiaOre(delta) {
    setOre((o) => {
      const nuovo = Math.min(12, Math.max(1, o + delta));
      setGriglia((g) => ridimensiona(g, nuovo));
      return nuovo;
    });
    setSalvato(false);
  }

  function cambiaCella(giorno, indice, valore) {
    setGriglia((g) => {
      const riga = (g[giorno] || []).slice();
      riga[indice] = valore;
      return { ...g, [giorno]: riga };
    });
    setSalvato(false);
  }

  async function salva() {
    setSalvando(true);
    setSalvato(false);
    try {
      const res = await fetch("/api/scuola/orario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ore, griglia }),
      });
      const json = await res.json();
      if (res.ok) {
        setOre(json.orario.ore);
        setGriglia(json.orario.griglia);
        setSalvato(true);
      }
    } finally {
      setSalvando(false);
    }
  }

  if (!ore || !griglia) {
    return (
      <section id="section-scuola-orario" className="card span-4">
        <h3>Orario scolastico</h3>
      </section>
    );
  }

  return (
    <section id="section-scuola-orario" className="card span-4">
      <div className="cal-header">
        <h3 style={{ marginBottom: 0 }}>Orario scolastico</h3>
        <div className="orario-ore-controllo">
          <span className="review-hint">Ore al giorno</span>
          <button type="button" onClick={() => cambiaOre(-1)} aria-label="Rimuovi un'ora">−</button>
          <span className="orario-ore-numero">{ore}</span>
          <button type="button" onClick={() => cambiaOre(1)} aria-label="Aggiungi un'ora">+</button>
        </div>
      </div>

      <div className="orario-scroll">
        <table className="orario-tabella">
          <thead>
            <tr>
              <th></th>
              {GIORNI.map((g) => (
                <th key={g.chiave}>{g.nome}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: ore }, (_, i) => (
              <tr key={i}>
                <td className="orario-riga-num">{i + 1}ª ora</td>
                {GIORNI.map((g) => (
                  <td key={g.chiave}>
                    <MateriaSelect
                      value={(griglia[g.chiave] || [])[i] || ""}
                      onChange={(v) => cambiaCella(g.chiave, i, v)}
                      placeholderVuoto="—"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="orario-azioni">
        <button type="button" onClick={salva} disabled={salvando} className="orario-salva">
          {salvando ? "Salvataggio..." : "Salva orario"}
        </button>
        {salvato && <span className="orario-salvato">Salvato ✓</span>}
      </div>
    </section>
  );
}

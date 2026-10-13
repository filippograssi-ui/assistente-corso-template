"use client";

import { useEffect, useState } from "react";
import MateriaSelect from "./MateriaSelect";
import { GIORNI_ORARIO } from "@/lib/scuola-agenda";

function ridimensiona(griglia, ore) {
  const nuova = {};
  for (const { chiave } of GIORNI_ORARIO) {
    const riga = griglia[chiave] || [];
    nuova[chiave] = Array.from({ length: ore }, (_, i) => riga[i] || "");
  }
  return nuova;
}

// Orario settimanale del docente, compatto: in ogni cella la CLASSE che ha
// quell'ora (le classi arrivano dalla card "Classi", oppure si scrivono a
// mano con "Altro"). Si salva tutto insieme con "Salva orario"; l'agenda qui
// sopra si aggiorna da sola.
export default function OrarioClassiCard() {
  const [ore, setOre] = useState(null);
  const [griglia, setGriglia] = useState(null);
  const [classi, setClassi] = useState([]);
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

  function caricaClassi() {
    fetch("/api/scuola/classi")
      .then((r) => r.json())
      .then((d) => setClassi(d.classi || []))
      .catch(() => setClassi([]));
  }

  useEffect(() => {
    caricaClassi();
    window.addEventListener("scuola:classi-aggiornate", caricaClassi);
    return () => window.removeEventListener("scuola:classi-aggiornate", caricaClassi);
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
        window.dispatchEvent(new Event("scuola:orario-aggiornato"));
      }
    } finally {
      setSalvando(false);
    }
  }

  if (!ore || !griglia) {
    return (
      <section id="section-scuola-orario" className="card span-4">
        <h3>Orario</h3>
      </section>
    );
  }

  const nomiClassi = classi.map((c) => c.nome);

  return (
    <section id="section-scuola-orario" className="card span-4 orario-compatto">
      <div className="cal-header">
        <h3 style={{ marginBottom: 0 }}>Orario — classi</h3>
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
              {GIORNI_ORARIO.map((g) => (
                <th key={g.chiave}>{g.nome.slice(0, 3)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: ore }, (_, i) => (
              <tr key={i}>
                <td className="orario-riga-num">{i + 1}ª</td>
                {GIORNI_ORARIO.map((g) => (
                  <td key={g.chiave}>
                    <MateriaSelect
                      value={(griglia[g.chiave] || [])[i] || ""}
                      onChange={(v) => cambiaCella(g.chiave, i, v)}
                      opzioni={nomiClassi}
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
        {nomiClassi.length === 0 && <span className="review-hint">Aggiungi prima le tue classi nella card qui a fianco.</span>}
      </div>
    </section>
  );
}

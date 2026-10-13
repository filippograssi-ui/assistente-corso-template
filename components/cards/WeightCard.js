"use client";

import { useEffect, useState } from "react";

const LARGHEZZA = 520;
const ALTEZZA = 160;
const PADDING_X = 8;
const PADDING_Y = 20;

function formattaGiorno(dataKey) {
  if (!dataKey) return "";
  const [y, m, d] = dataKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}

function costruisciPunti(log) {
  if (log.length === 0) return { punti: "", cerchi: [], min: 0, max: 0 };
  const valori = log.map((v) => v.kg);
  const min = Math.min(...valori);
  const max = Math.max(...valori);
  const range = max - min || 1;
  const stepX = log.length > 1 ? (LARGHEZZA - PADDING_X * 2) / (log.length - 1) : 0;

  const coord = log.map((v, i) => {
    const x = PADDING_X + i * stepX;
    const y = PADDING_Y + (ALTEZZA - PADDING_Y * 2) * (1 - (v.kg - min) / range);
    return { x, y, kg: v.kg, data: v.data, id: v.id };
  });

  const punti = coord.map((c) => `${c.x},${c.y}`).join(" ");
  return { punti, cerchi: coord, min, max };
}

// L'ultima misurazione con data <= (oggi - giorniFa), per calcolare "quanto è
// cambiato il peso rispetto a N giorni fa" — se non c'è nulla di così vecchio,
// usa la misurazione più antica disponibile.
function trovaRiferimento(log, giorniFa) {
  const oggi = new Date();
  const soglia = new Date(oggi);
  soglia.setDate(soglia.getDate() - giorniFa);
  const sogliaKey = soglia.toISOString().slice(0, 10);
  let riferimento = null;
  for (const v of log) {
    if (v.data <= sogliaKey) riferimento = v;
  }
  return riferimento || log[0] || null;
}

function calcolaStatistichePeso(log) {
  if (log.length === 0) return null;
  const ultimo = log[log.length - 1];
  const rif7 = trovaRiferimento(log, 7);
  const rif30 = trovaRiferimento(log, 30);
  const variazione7 = rif7 && rif7.id !== ultimo.id ? Math.round((ultimo.kg - rif7.kg) * 10) / 10 : null;
  const variazione30 = rif30 && rif30.id !== ultimo.id ? Math.round((ultimo.kg - rif30.kg) * 10) / 10 : null;
  return { attuale: ultimo.kg, variazione7, variazione30 };
}

function formattaVariazione(v) {
  if (v === null || v === undefined) return "—";
  if (v === 0) return "invariato";
  return `${v > 0 ? "+" : ""}${v} kg`;
}

export default function WeightCard() {
  const [log, setLog] = useState(null);
  const [kg, setKg] = useState("");
  const [nota, setNota] = useState("");
  const [inviando, setInviando] = useState(false);
  const [hover, setHover] = useState(null); // indice del punto sotto il mouse/tocco

  function load() {
    fetch("/api/weight")
      .then((r) => r.json())
      .then((d) => setLog(d.log || []))
      .catch(() => setLog([]));
  }

  useEffect(() => {
    load();
    // L'import da Apple Salute (card Allenamenti) può aggiungere pesi.
    window.addEventListener("salute:peso-aggiornato", load);
    return () => window.removeEventListener("salute:peso-aggiornato", load);
  }, []);

  async function aggiungi(e) {
    e.preventDefault();
    const valore = Number(kg.replace(",", "."));
    if (!Number.isFinite(valore) || valore <= 0) return;
    setInviando(true);
    try {
      const res = await fetch("/api/weight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kg: valore, nota }),
      });
      const data = await res.json();
      setLog(data.log || []);
      setKg("");
      setNota("");
    } finally {
      setInviando(false);
    }
  }

  async function elimina(id) {
    setLog((cur) => cur.filter((v) => v.id !== id));
    await fetch(`/api/weight/${id}`, { method: "DELETE" }).catch(() => load());
  }

  if (log === null) {
    return (
      <section id="section-peso" className="card span-2">
        <h3>Peso</h3>
      </section>
    );
  }

  const { punti, cerchi, min, max } = costruisciPunti(log);
  const stats = calcolaStatistichePeso(log);
  const puntoHover = hover !== null ? cerchi[hover] : null;

  return (
    <section id="section-peso" className="card span-2">
      <h3>Peso</h3>

      {stats && (
        <div className="peso-stats">
          <div className="peso-stat">
            <span className="peso-stat-val">{stats.attuale} kg</span>
            <span className="peso-stat-label">attuale</span>
          </div>
          <div className="peso-stat">
            <span className="peso-stat-val">{formattaVariazione(stats.variazione7)}</span>
            <span className="peso-stat-label">ultimi 7gg</span>
          </div>
          <div className="peso-stat">
            <span className="peso-stat-val">{formattaVariazione(stats.variazione30)}</span>
            <span className="peso-stat-label">ultimo mese</span>
          </div>
        </div>
      )}

      {log.length > 1 ? (
        <div className="peso-chart-wrap">
          <span className="peso-chart-asse peso-chart-asse-max">{max} kg</span>
          <span className="peso-chart-asse peso-chart-asse-min">{min} kg</span>
          <svg width="100%" height={ALTEZZA} viewBox={`0 0 ${LARGHEZZA} ${ALTEZZA}`} preserveAspectRatio="none" className="peso-chart">
            <polyline points={punti} fill="none" stroke="var(--accent)" strokeWidth="2" />
            {cerchi.map((c, i) => (
              <g key={c.id}>
                <circle cx={c.x} cy={c.y} r="2.5" fill="var(--accent)" />
                <circle
                  cx={c.x}
                  cy={c.y}
                  r="9"
                  fill="transparent"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover((cur) => (cur === i ? null : cur))}
                  onClick={() => setHover((cur) => (cur === i ? null : i))}
                  style={{ cursor: "pointer" }}
                />
              </g>
            ))}
          </svg>
          {puntoHover && (
            <div
              className="peso-tooltip"
              style={{ left: `${(puntoHover.x / LARGHEZZA) * 100}%`, top: `${(puntoHover.y / ALTEZZA) * 100}%` }}
            >
              {formattaGiorno(puntoHover.data)} · {puntoHover.kg} kg
            </div>
          )}
          <div className="peso-chart-date">
            <span>{formattaGiorno(log[0].data)}</span>
            <span>{formattaGiorno(log[log.length - 1].data)}</span>
          </div>
        </div>
      ) : (
        <p className="peso-hint">Registra qualche peso per vedere l&apos;andamento nel tempo.</p>
      )}

      <form className="peso-form" onSubmit={aggiungi}>
        <input
          type="text"
          inputMode="decimal"
          placeholder="kg oggi"
          value={kg}
          onChange={(e) => setKg(e.target.value)}
          disabled={inviando}
        />
        <input
          type="text"
          placeholder="nota (facoltativa)"
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          disabled={inviando}
        />
        <button type="submit" disabled={inviando}>Registra</button>
      </form>
      {log.length > 0 && (
        <div className="peso-lista">
          {log.slice(-5).reverse().map((v) => (
            <div key={v.id} className="peso-riga">
              <span>{v.data}</span>
              <span className="peso-riga-kg">{v.kg} kg{v.nota ? ` · ${v.nota}` : ""}</span>
              <span className="peso-elimina" onClick={() => elimina(v.id)}>✕</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

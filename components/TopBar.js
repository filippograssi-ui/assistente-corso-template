"use client";

import { useEffect, useState } from "react";

const SCREENS = [
  { id: "home", label: "Home" },
  { id: "scuola", label: "Scuola" },
  { id: "salute", label: "Salute" },
  { id: "finanze", label: "Finanze" },
];

// "Svago" non apre subito una schermata come le altre voci: apre un menu a
// tendina con gli ambiti tra cui scegliere (richiesta esplicita di
// Filippo) — è l'ambito scelto ad aprire la schermata vera e propria.
const AMBITI_SVAGO = [
  { id: "svago-viaggio", label: "Viaggio" },
  { id: "svago-watchlist", label: "Watch list" },
  { id: "svago-libri", label: "Libri" },
  { id: "svago-posti", label: "Uscite con gli amici" },
  { id: "svago-notizie", label: "Notizie" },
  { id: "svago-moda", label: "Trend moda" },
];

const SCREENS_DOPO_SVAGO = [
  { id: "review", label: "Review" },
];

// Scala di colori della fiamma: più la serie di giorni consecutivi è lunga, più
// "si scalda" — dal grigio spento (0 giorni) fino al viola/blu, il colore delle
// fiamme più calde in natura, per una serie molto lunga.
function coloreFiamma(streak) {
  if (streak <= 0) return "#c2c7cf"; // spenta
  if (streak <= 2) return "#f5b04a"; // arancione chiaro
  if (streak <= 6) return "#e08a2c"; // arancione pieno
  if (streak <= 13) return "#e0522c"; // rosso-arancio
  if (streak <= 29) return "#d64545"; // rosso acceso
  return "#8e44ad"; // viola: la serie più lunga, il "fuoco" più caldo
}

// Saluto, ora e serie di giorni consecutivi vivono qui, nella barra in alto —
// non più in una card a parte nella Home: niente riquadro, solo testo a fianco.
// Al posto del logo "PersonalOS" c'è la fiamma animata con il numero di giorni
// di fila dentro: cambia colore da sola via via che la serie si allunga.
export default function TopBar({ active, onChange }) {
  const [now, setNow] = useState(null);
  const [profilo, setProfilo] = useState(null);
  const [svagoAperto, setSvagoAperto] = useState(false);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetch("/api/operator")
      .then((r) => r.json())
      .then(setProfilo)
      .catch(() => setProfilo(null));
  }, []);

  const saluto = now
    ? now.getHours() < 6
      ? "Buonanotte"
      : now.getHours() < 13
      ? "Buongiorno"
      : now.getHours() < 18
      ? "Buon pomeriggio"
      : "Buonasera"
    : "";
  const ora = now ? now.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) : "--:--";
  const streak = profilo?.streak ?? 0;

  return (
    <div id="topbar">
      <div className="app topbar-inner">
        <div
          className="topbar-fiamma"
          style={{ background: coloreFiamma(streak) }}
          title={`${streak} ${streak === 1 ? "giorno di fila" : "giorni di fila"}`}
        >
          <span className="topbar-fiamma-num">{streak}</span>
        </div>

        {profilo && now && (
          <div className="topbar-saluto">
            <span className="topbar-saluto-testo">{saluto}, {profilo.nome}</span>
            <span className="topbar-ora">{ora}</span>
          </div>
        )}

        <nav>
          {SCREENS.map((s) => (
            <button
              key={s.id}
              className={active === s.id ? "active" : ""}
              onClick={() => onChange(s.id)}
            >
              {s.label}
            </button>
          ))}

          <div className="topbar-svago">
            <button
              type="button"
              className={AMBITI_SVAGO.some((a) => a.id === active) ? "active" : ""}
              onClick={() => setSvagoAperto((v) => !v)}
            >
              Svago
            </button>
            {svagoAperto && (
              <div className="topbar-svago-menu">
                {AMBITI_SVAGO.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    className={active === a.id ? "active" : ""}
                    onClick={() => {
                      onChange(a.id);
                      setSvagoAperto(false);
                    }}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {SCREENS_DOPO_SVAGO.map((s) => (
            <button
              key={s.id}
              className={active === s.id ? "active" : ""}
              onClick={() => onChange(s.id)}
            >
              {s.label}
            </button>
          ))}

          <button
            type="button"
            className={`topbar-impostazioni ${active === "impostazioni" ? "active" : ""}`}
            onClick={() => onChange("impostazioni")}
            title="Impostazioni"
            aria-label="Impostazioni"
          >
            ⚙
          </button>
        </nav>
      </div>
    </div>
  );
}

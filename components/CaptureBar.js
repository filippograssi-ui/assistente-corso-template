"use client";

import { useEffect, useRef, useState } from "react";

const PAROLE_INTERROGATIVE = [
  "chi", "cosa", "come", "quando", "dove", "perché", "perche",
  "quanto", "quanta", "quanti", "quante", "quale", "quali",
];

// Non decidiamo in anticipo se il testo è un'informazione o una domanda: lo guardiamo
// e basta. Finisce con "?" o comincia con una parola interrogativa -> è una domanda.
function isDomanda(testo) {
  const t = testo.trim();
  if (!t) return false;
  if (t.endsWith("?")) return true;
  const primaParola = t.split(/\s+/)[0].toLowerCase().replace(/[^a-zàèéìòù']/g, "");
  return PAROLE_INTERROGATIVE.includes(primaParola);
}

// Cinque stati: a riposo, in ascolto, in elaborazione, fatto, con una risposta aperta.
export default function CaptureBar() {
  const [value, setValue] = useState("");
  const [state, setState] = useState("riposo"); // riposo | ascolto | elaborazione | fatto | risposta
  const [lastDestination, setLastDestination] = useState(null);
  const [risposta, setRisposta] = useState(null);
  const [micSupportato, setMicSupportato] = useState(true); // ottimista finché non verifichiamo lato client
  const recognitionRef = useRef(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      // Safari non implementa questa API: il microfono resta visibile ma disabilitato,
      // con una spiegazione, invece di sembrare "rotto" senza dire perché.
      setMicSupportato(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "it-IT";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setValue(transcript);
      submit(transcript);
    };
    recognition.onerror = () => setState("riposo");
    recognition.onend = () => setState((s) => (s === "ascolto" ? "riposo" : s));

    recognitionRef.current = recognition;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Chiusura della risposta con Esc, da qualunque punto della pagina.
  useEffect(() => {
    if (state !== "risposta") return;
    function onKeyDown(e) {
      if (e.key === "Escape") chiudiRisposta();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  function chiudiRisposta() {
    setState("riposo");
    setRisposta(null);
  }

  function toggleMic() {
    if (!recognitionRef.current) return;
    if (state === "ascolto") {
      recognitionRef.current.stop();
      setState("riposo");
    } else {
      setState("ascolto");
      recognitionRef.current.start();
    }
  }

  async function chiedi(domanda) {
    setState("elaborazione");
    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domanda }),
      });
      const data = await res.json();
      setRisposta(res.ok ? data.risposta : "Qualcosa è andato storto, riprova.");
    } catch {
      setRisposta("Qualcosa è andato storto, riprova.");
    }
    setState("risposta");
    setValue("");
  }

  async function cattura(testo) {
    setState("elaborazione");
    try {
      const res = await fetch("/api/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testo }),
      });
      const data = await res.json();
      setLastDestination(res.ok ? data.destinazione : "errore");
    } catch {
      setLastDestination("errore");
    }
    setState("fatto");
    setValue("");
    setTimeout(() => {
      setState("riposo");
      setLastDestination(null);
    }, 2000);
  }

  async function submit(testo) {
    const testoFinale = (testo ?? value).trim();
    if (!testoFinale) return;

    if (isDomanda(testoFinale)) {
      chiedi(testoFinale);
    } else {
      cattura(testoFinale);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    submit();
  }

  const statusLabel = {
    riposo: "a riposo",
    ascolto: "in ascolto…",
    elaborazione: "in elaborazione…",
    fatto: lastDestination === "errore" ? "qualcosa è andato storto" : `messo in ${lastDestination}`,
    risposta: "",
  }[state];

  return (
    <>
      {state === "risposta" && (
        <div id="answer-panel" role="dialog" aria-label="Risposta">
          <button type="button" className="answer-close" aria-label="Chiudi" onClick={chiudiRisposta}>
            ✕
          </button>
          <p className="answer-text">{risposta}</p>
        </div>
      )}
      <form id="capture-bar" onSubmit={handleSubmit}>
        <span className="status">{statusLabel}</span>
        <button
          type="button"
          className={`mic-btn${state === "ascolto" ? " listening" : ""}`}
          aria-label="Microfono"
          title={micSupportato ? "Dettatura" : "Dettatura non supportata in questo browser (funziona in Chrome, non in Safari) — usa il testo"}
          disabled={!micSupportato}
          onClick={toggleMic}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="3" width="6" height="11" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
          </svg>
        </button>
        <input
          type="text"
          placeholder="Cosa devo ricordarmi? (o fai una domanda)"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={state === "elaborazione"}
        />
        <button type="submit" className="send-btn" aria-label="Invia" disabled={state === "elaborazione"}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </form>
    </>
  );
}

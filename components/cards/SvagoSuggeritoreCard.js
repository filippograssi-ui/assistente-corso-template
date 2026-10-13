"use client";

import { useEffect, useState } from "react";
import { AMBITI_SVAGO, PIATTAFORME_WATCHLIST, GENERI_WATCHLIST, TIPI_WATCHLIST, GENERI_LIBRI } from "@/lib/svago";
import { notificaSvagoListaAggiornata } from "@/lib/svago-eventi";
import MateriaSelect from "./MateriaSelect";

// Card generica riusata nelle tre schermate Svago: gusti scritti a mano
// (facoltativi), un pulsante per farsi suggerire qualcosa di spontaneo, e un
// campo per chiedere qualcosa di specifico ("cosa mi piacerebbe vedere?").
// In entrambi i casi il modello risponde con ESATTAMENTE due proposte tra
// cui scegliere (richiesta esplicita di Filippo) — la stessa rotta
// /api/svago/[ambito]/suggerisci gestisce entrambi i casi.
//
// Per Watch list e Uscite con gli amici, Filippo sceglie PRIMA le
// caratteristiche fisse del suggerimento (piattaforma/tipo/genere, o il
// luogo) e POI chiede il suggerimento — non il contrario: non sono campi da
// correggere sulle proposte già arrivate, sono criteri che il modello deve
// rispettare fin dall'inizio. Genere (Watch list) e luogo (Uscite) sono
// obbligatori per generare un suggerimento, così come lo sono per
// aggiungere una voce a mano in SvagoListaCard. Quando Filippo sceglie una
// proposta, questi stessi criteri (non qualcosa scritto dal modello)
// diventano i campi extra della voce salvata in lista.
export default function SvagoSuggeritoreCard({ ambito, sezioneId }) {
  const info = AMBITI_SVAGO[ambito];
  const [preferenze, setPreferenze] = useState("");
  const [preferenzeCaricate, setPreferenzeCaricate] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [piattaforma, setPiattaforma] = useState("");
  const [tipo, setTipo] = useState("");
  const [genere, setGenere] = useState("");
  const [luogo, setLuogo] = useState("");
  const [richiesta, setRichiesta] = useState("");
  const [proposte, setProposte] = useState(null);
  const [generando, setGenerando] = useState(false);
  const [errore, setErrore] = useState(null);
  const [scegliendo, setScegliendo] = useState(null);

  useEffect(() => {
    fetch(`/api/svago/${ambito}/preferenze`)
      .then((r) => r.json())
      .then((d) => setPreferenze(d.preferenze || ""))
      .catch(() => {})
      .finally(() => setPreferenzeCaricate(true));
  }, [ambito]);

  async function salvaPreferenze() {
    setSalvando(true);
    try {
      await fetch(`/api/svago/${ambito}/preferenze`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferenze }),
      });
    } finally {
      setSalvando(false);
    }
  }

  const filtroMancante = ambito === "watchlist" ? !genere : ambito === "posti" ? !luogo.trim() : false;

  async function generaProposte(conRichiesta) {
    if (filtroMancante) {
      setErrore(
        ambito === "watchlist"
          ? "Seleziona almeno il genere prima di generare suggerimenti"
          : "Indica il luogo prima di generare suggerimenti"
      );
      return;
    }
    setGenerando(true);
    setErrore(null);
    setProposte(null);
    try {
      const filtri =
        ambito === "watchlist" ? { piattaforma, tipo, genere } : ambito === "posti" ? { luogo: luogo.trim() } : ambito === "libri" ? { genere } : {};
      const res = await fetch(`/api/svago/${ambito}/suggerisci`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ richiesta: conRichiesta ? richiesta.trim() : "", filtri }),
      });
      const json = await res.json();
      if (!res.ok) setErrore(json.error || "Errore nella generazione");
      else setProposte(json.proposte);
    } catch {
      setErrore("Errore di rete");
    } finally {
      setGenerando(false);
    }
  }

  async function scegli(proposta, indice) {
    setScegliendo(indice);
    try {
      const testo = proposta.descrizione ? `${proposta.titolo} — ${proposta.descrizione}` : proposta.titolo;
      const body = { testo };
      if (ambito === "watchlist") {
        body.piattaforma = piattaforma;
        body.tipo = tipo;
        body.genere = genere;
      } else if (ambito === "posti") {
        body.luogo = luogo.trim();
      } else if (ambito === "libri") {
        body.genere = genere;
        // "Titolo — descrizione": l'autore, se il modello lo ha messo nel
        // titolo ("Titolo, Autore"), resta nel testo della voce.
      }
      const res = await fetch(`/api/svago/${ambito}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setProposte(null);
        setRichiesta("");
        notificaSvagoListaAggiornata(ambito);
      }
    } finally {
      setScegliendo(null);
    }
  }

  return (
    <section id={sezioneId} className="card span-2 svago-suggeritore">
      <h3>Suggerimenti per te</h3>

      <div className="svago-preferenze">
        <label className="svago-preferenze-label" htmlFor={`${sezioneId}-preferenze`}>
          I tuoi gusti (facoltativo)
        </label>
        <textarea
          id={`${sezioneId}-preferenze`}
          rows={2}
          placeholder={`Scrivi qui i tuoi gusti su ${info.cosaPlurale}...`}
          value={preferenze}
          disabled={!preferenzeCaricate}
          onChange={(e) => setPreferenze(e.target.value)}
          onBlur={salvaPreferenze}
        />
        {salvando && <span className="svago-preferenze-stato">Salvo...</span>}
      </div>

      {ambito === "watchlist" && (
        <div className="svago-filtri-suggerimento">
          <MateriaSelect
            value={piattaforma}
            onChange={setPiattaforma}
            opzioni={PIATTAFORME_WATCHLIST}
            placeholderVuoto="— piattaforma (facoltativo) —"
            className="svago-select-extra"
          />
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="">— film o serie (facoltativo) —</option>
            {TIPI_WATCHLIST.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <MateriaSelect
            value={genere}
            onChange={setGenere}
            opzioni={GENERI_WATCHLIST}
            placeholderVuoto="— genere —"
            className="svago-select-extra"
          />
        </div>
      )}
      {ambito === "libri" && (
        <div className="svago-filtri-suggerimento">
          <MateriaSelect
            value={genere}
            onChange={setGenere}
            opzioni={GENERI_LIBRI}
            placeholderVuoto="— genere (facoltativo) —"
            className="svago-select-extra"
          />
        </div>
      )}
      {ambito === "posti" && (
        <div className="svago-filtri-suggerimento">
          <input
            type="text"
            value={luogo}
            onChange={(e) => setLuogo(e.target.value)}
            placeholder="Luogo (es. Saronno)"
          />
        </div>
      )}
      {filtroMancante && (
        <p className="review-hint">
          {ambito === "watchlist"
            ? "Seleziona almeno il genere per generare suggerimenti."
            : "Indica il luogo per generare suggerimenti."}
        </p>
      )}

      <div className="svago-suggerimenti-azioni">
        <button type="button" onClick={() => generaProposte(false)} disabled={generando || filtroMancante}>
          {generando ? "Sto pensando..." : "Suggeriscimi qualcosa"}
        </button>
      </div>

      <div className="svago-chiedi">
        <input
          type="text"
          placeholder="Chiedimi cosa ti piacerebbe..."
          value={richiesta}
          onChange={(e) => setRichiesta(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && richiesta.trim() && !filtroMancante) generaProposte(true);
          }}
        />
        <button type="button" onClick={() => generaProposte(true)} disabled={generando || !richiesta.trim() || filtroMancante}>
          Chiedi
        </button>
      </div>

      {errore && <p className="review-errore">{errore}</p>}

      {proposte && (
        <div className="svago-proposte">
          {proposte.map((p, i) => (
            <div key={i} className="svago-proposta">
              <div className="svago-proposta-titolo">{p.titolo}</div>
              {p.descrizione && <div className="svago-proposta-descrizione">{p.descrizione}</div>}
              <button type="button" onClick={() => scegli(p, i)} disabled={scegliendo !== null}>
                {scegliendo === i ? "Aggiungo..." : "Scegli questa"}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

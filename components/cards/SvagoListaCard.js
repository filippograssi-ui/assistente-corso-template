"use client";

import { useEffect, useState } from "react";
import { EVENTO_SVAGO_LISTA_AGGIORNATA } from "@/lib/svago-eventi";
import { PIATTAFORME_WATCHLIST, GENERI_WATCHLIST, TIPI_WATCHLIST, GENERI_LIBRI } from "@/lib/svago";
import MateriaSelect from "./MateriaSelect";

// Card generica per i tre ambiti di Svago (Viaggio, Watch list, Posti dove
// uscire): stessa struttura semplice di "To do scuola" — testo libero +
// casella di spunta — parametrizzata sull'ambito così non serve un
// componente diverso per ognuno. Le classi CSS sono le stesse di
// "To do scuola" (generalizzate per classe, non più scoped per id, proprio
// per poter essere riusate qui).
//
// Watch list e Uscite con gli amici hanno anche dei campi extra (richiesta
// di Filippo, dopo il primo collaudo): Watch list chiede piattaforma, tipo
// (film o serie) e genere; Uscite chiede il luogo (usato anche per filtrare
// la lista qui sotto) e un link facoltativo per prenotare. Viaggio resta
// solo testo libero, come prima — non richiesto lì.
// MateriaSelect è riusato qui pur avendo un nome "da Scuola": è in realtà un
// generico menu a tendina con opzione "Altro" per scrivere a mano.
export default function SvagoListaCard({ ambito, titolo, placeholder, etichettaFatto, sezioneId }) {
  const [lista, setLista] = useState(null);
  const [testo, setTesto] = useState("");
  const [piattaforma, setPiattaforma] = useState("");
  const [tipo, setTipo] = useState("");
  const [genere, setGenere] = useState("");
  const [luogo, setLuogo] = useState("");
  const [autore, setAutore] = useState("");
  const [link, setLink] = useState("");
  const [filtroLuogo, setFiltroLuogo] = useState("");
  const [inviando, setInviando] = useState(false);
  const [errore, setErrore] = useState(null);

  function carica() {
    fetch(`/api/svago/${ambito}`)
      .then((r) => r.json())
      .then((d) => setLista(d.lista || []))
      .catch(() => setLista([]));
  }

  useEffect(carica, [ambito]);

  useEffect(() => {
    function onAggiornato(e) {
      if (e.detail?.ambito === ambito) carica();
    }
    window.addEventListener(EVENTO_SVAGO_LISTA_AGGIORNATA, onAggiornato);
    return () => window.removeEventListener(EVENTO_SVAGO_LISTA_AGGIORNATA, onAggiornato);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ambito]);

  async function aggiungi(e) {
    e.preventDefault();
    const testoPulito = testo.trim();
    if (!testoPulito) return;
    if (ambito === "watchlist" && !genere) {
      setErrore("Seleziona almeno il genere");
      return;
    }
    if (ambito === "posti" && !luogo.trim()) {
      setErrore("Indica il luogo (serve a filtrare la lista qui sotto)");
      return;
    }
    setErrore(null);
    setInviando(true);
    try {
      const body = { testo: testoPulito };
      if (ambito === "watchlist") {
        body.piattaforma = piattaforma;
        body.tipo = tipo;
        body.genere = genere;
      } else if (ambito === "posti") {
        body.luogo = luogo.trim();
        body.link = link.trim();
      } else if (ambito === "libri") {
        body.autore = autore.trim();
        body.genere = genere;
      }
      const res = await fetch(`/api/svago/${ambito}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (res.ok) {
        setLista(json.lista);
        setTesto("");
        setPiattaforma("");
        setTipo("");
        setGenere("");
        setLuogo("");
        setLink("");
        setAutore("");
      } else {
        setErrore(json.error || "Aggiunta non riuscita");
      }
    } finally {
      setInviando(false);
    }
  }

  async function alterna(id) {
    const res = await fetch(`/api/svago/${ambito}/${id}`, { method: "PATCH" });
    const json = await res.json();
    if (res.ok) setLista(json.lista);
  }

  async function elimina(id) {
    const res = await fetch(`/api/svago/${ambito}/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (res.ok) setLista(json.lista);
  }

  if (!lista) {
    return (
      <section id={sezioneId} className="card span-2">
        <h3>{titolo}</h3>
      </section>
    );
  }

  const listaVisibile =
    ambito === "posti" && filtroLuogo.trim()
      ? lista.filter((v) => (v.luogo || "").toLowerCase().includes(filtroLuogo.trim().toLowerCase()))
      : lista;
  const daFare = listaVisibile.filter((v) => !v.fatto);
  const fatti = listaVisibile.filter((v) => v.fatto);

  function tagVoce(v) {
    if (ambito === "watchlist") {
      const parti = [v.tipo, v.genere, v.piattaforma].filter(Boolean);
      return parti.length ? <span className="svago-voce-tag">{parti.join(" · ")}</span> : null;
    }
    if (ambito === "posti") {
      return v.luogo ? <span className="svago-voce-tag">{v.luogo}</span> : null;
    }
    if (ambito === "libri") {
      const parti = [v.autore, v.genere].filter(Boolean);
      return parti.length ? <span className="svago-voce-tag">{parti.join(" · ")}</span> : null;
    }
    return null;
  }

  function renderVoce(v) {
    return (
      <div key={v.id} className={`scuola-todo-item${v.fatto ? " fatto" : ""}`}>
        <input type="checkbox" checked={v.fatto} onChange={() => alterna(v.id)} />
        <span>
          {v.testo}
          {tagVoce(v)}
          {ambito === "posti" && v.link && (
            <a href={v.link} target="_blank" rel="noopener noreferrer" className="svago-voce-link">
              Prenota
            </a>
          )}
        </span>
        <button type="button" className="scuola-todo-elimina" onClick={() => elimina(v.id)} aria-label="Elimina">
          ✕
        </button>
      </div>
    );
  }

  return (
    <section id={sezioneId} className="card span-2">
      <h3>{titolo}</h3>
      <form onSubmit={aggiungi} className="scuola-todo-form svago-lista-form">
        <input
          type="text"
          value={testo}
          onChange={(e) => setTesto(e.target.value)}
          placeholder={placeholder}
        />
        {ambito === "watchlist" && (
          <>
            <MateriaSelect
              value={piattaforma}
              onChange={setPiattaforma}
              opzioni={PIATTAFORME_WATCHLIST}
              placeholderVuoto="— piattaforma —"
              className="svago-select-extra"
            />
            <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="">— film o serie —</option>
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
          </>
        )}
        {ambito === "libri" && (
          <>
            <input type="text" value={autore} onChange={(e) => setAutore(e.target.value)} placeholder="Autore (facoltativo)" />
            <MateriaSelect
              value={genere}
              onChange={setGenere}
              opzioni={GENERI_LIBRI}
              placeholderVuoto="— genere —"
              className="svago-select-extra"
            />
          </>
        )}
        {ambito === "posti" && (
          <>
            <input
              type="text"
              value={luogo}
              onChange={(e) => setLuogo(e.target.value)}
              placeholder="Luogo (es. Saronno)"
            />
            <input
              type="text"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="Link per prenotare (facoltativo)"
            />
          </>
        )}
        <button type="submit" disabled={inviando}>Aggiungi</button>
      </form>

      {errore && <p className="review-errore">{errore}</p>}

      {ambito === "posti" && lista.length > 0 && (
        <div className="svago-filtro-luogo">
          <input
            type="text"
            value={filtroLuogo}
            onChange={(e) => setFiltroLuogo(e.target.value)}
            placeholder="Filtra per luogo..."
          />
        </div>
      )}

      <div className="scuola-todo-list">
        {daFare.length === 0 && fatti.length === 0 && (
          <p className="review-hint">
            {ambito === "posti" && filtroLuogo.trim() ? "Nessun posto per questo luogo." : "Ancora nulla qui."}
          </p>
        )}
        {daFare.map(renderVoce)}
        {fatti.length > 0 && (
          <>
            <div className="review-hint" style={{ marginTop: 10 }}>{etichettaFatto}</div>
            {fatti.map(renderVoce)}
          </>
        )}
      </div>
    </section>
  );
}

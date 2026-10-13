"use client";

import { useEffect, useRef, useState } from "react";
import { toDateKey, sameDay } from "@/lib/calendar-grid";

const NOMI_GIORNI = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì"];

function inizioSettimana(d) {
  const offset = (d.getDay() + 6) % 7; // 0 = lunedì
  const r = new Date(d);
  r.setDate(d.getDate() - offset);
  r.setHours(0, 0, 0, 0);
  return r;
}

function formattaDimensione(bytes) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function eLinkTeams(url) {
  return /teams\.microsoft\.com|teams\.live\.com/i.test(url || "");
}

// Agenda del docente: sopra la settimana (lun-ven) da scorrere, sotto la
// pagina del giorno scelto, divisa per classe in base all'orario (le ore
// consecutive con la stessa classe sono un unico blocco). In ogni blocco:
// appunti liberi, cose da fare in classe, link (Teams compreso) e allegati.
export default function AgendaDocenteCard() {
  const [oggi, setOggi] = useState(null);
  const [settimana, setSettimana] = useState(null);
  const [giornoScelto, setGiornoScelto] = useState(null);
  const [conContenuto, setConContenuto] = useState({});
  const [giorno, setGiorno] = useState(null); // { data, weekend, blocchi }
  const [caricando, setCaricando] = useState(false);

  useEffect(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    setOggi(now);
    setSettimana(inizioSettimana(now));
    // Nel weekend si apre direttamente il lunedì successivo: è lì che serve guardare.
    const dow = now.getDay();
    if (dow === 0 || dow === 6) {
      const lunedi = new Date(now);
      lunedi.setDate(now.getDate() + (dow === 6 ? 2 : 1));
      setSettimana(inizioSettimana(lunedi));
      setGiornoScelto(lunedi);
    } else {
      setGiornoScelto(now);
    }
  }, []);

  function caricaSettimana(lunedi) {
    fetch(`/api/scuola/agenda?settimana=${toDateKey(lunedi)}`)
      .then((r) => r.json())
      .then((d) => setConContenuto(d.settimana || {}))
      .catch(() => setConContenuto({}));
  }

  function caricaGiorno(d) {
    setCaricando(true);
    fetch(`/api/scuola/agenda?data=${toDateKey(d)}`)
      .then((r) => r.json())
      .then((j) => setGiorno(j))
      .catch(() => setGiorno(null))
      .finally(() => setCaricando(false));
  }

  useEffect(() => {
    if (settimana) caricaSettimana(settimana);
  }, [settimana]);

  useEffect(() => {
    if (giornoScelto) caricaGiorno(giornoScelto);
  }, [giornoScelto]);

  // L'orario può essere cambiato nell'altra card: si ricaricano i blocchi.
  useEffect(() => {
    function onOrario() {
      if (giornoScelto) caricaGiorno(giornoScelto);
    }
    window.addEventListener("scuola:orario-aggiornato", onOrario);
    window.addEventListener("scuola:classi-aggiornate", onOrario);
    return () => {
      window.removeEventListener("scuola:orario-aggiornato", onOrario);
      window.removeEventListener("scuola:classi-aggiornate", onOrario);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [giornoScelto]);

  function cambiaSettimana(delta) {
    setSettimana((s) => {
      const r = new Date(s);
      r.setDate(r.getDate() + delta * 7);
      return r;
    });
  }

  function aggiornaPagina(chiaveBlocco, pagina) {
    setGiorno((g) => (g ? { ...g, blocchi: g.blocchi.map((b) => (b.chiave === chiaveBlocco ? { ...b, pagina } : b)) } : g));
    if (giornoScelto) {
      const chiave = toDateKey(giornoScelto);
      setConContenuto((c) => ({ ...c, [chiave]: true }));
    }
  }

  if (!oggi || !settimana || !giornoScelto) {
    return (
      <section id="section-agenda-docente" className="card span-4">
        <h3>Agenda</h3>
      </section>
    );
  }

  const giorni = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(settimana);
    d.setDate(d.getDate() + i);
    return d;
  });
  const etichettaSettimana = `${giorni[0].toLocaleDateString("it-IT", { day: "numeric", month: "long" })} – ${giorni[4].toLocaleDateString("it-IT", { day: "numeric", month: "long" })}`;

  return (
    <section id="section-agenda-docente" className="card span-4">
      <div className="cal-header">
        <h3 style={{ marginBottom: 0 }}>Agenda — {etichettaSettimana}</h3>
        <div className="cal-nav">
          <button type="button" onClick={() => cambiaSettimana(-1)} aria-label="Settimana precedente">‹</button>
          <button
            type="button"
            onClick={() => {
              setSettimana(inizioSettimana(oggi));
              setGiornoScelto(oggi);
            }}
          >
            Oggi
          </button>
          <button type="button" onClick={() => cambiaSettimana(1)} aria-label="Settimana successiva">›</button>
        </div>
      </div>

      <div className="agenda-settimana">
        {giorni.map((d, i) => {
          const chiave = toDateKey(d);
          const scelto = sameDay(d, giornoScelto);
          return (
            <button
              type="button"
              key={chiave}
              className={`agenda-giorno${scelto ? " scelto" : ""}${sameDay(d, oggi) ? " oggi" : ""}`}
              onClick={() => setGiornoScelto(d)}
            >
              <span className="agenda-giorno-nome">{NOMI_GIORNI[i]}</span>
              <span className="agenda-giorno-numero">{d.getDate()}</span>
              {conContenuto[chiave] && <span className="agenda-giorno-pallino" title="Ci sono appunti" />}
            </button>
          );
        })}
      </div>

      <div className="agenda-giorno-titolo">
        {giornoScelto.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}
        {caricando && <span className="review-hint"> · carico…</span>}
      </div>

      {giorno && giorno.blocchi && (
        <div className="agenda-blocchi">
          {giorno.blocchi.length === 1 && (
            <p className="review-hint">
              Nessuna classe in orario per questo giorno: compila l&apos;orario qui sotto (una classe per ogni ora) e
              l&apos;agenda si divide da sola per classe.
            </p>
          )}
          {giorno.blocchi.map((b) => (
            <BloccoAgenda
              key={`${giorno.data}-${b.chiave}`}
              data={giorno.data}
              blocco={b}
              onPagina={(pagina) => aggiornaPagina(b.chiave, pagina)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// Un blocco (una classe in una fascia di ore, oppure la "Giornata"): la sua
// pagina di agenda. Gli appunti si salvano da soli poco dopo aver smesso di
// scrivere; cose da fare, link e allegati si salvano a ogni modifica.
function BloccoAgenda({ data, blocco, onPagina }) {
  const [aperto, setAperto] = useState(Boolean(blocco.classe) || hasContenuto(blocco.pagina));
  const [appunti, setAppunti] = useState(blocco.pagina.appunti || "");
  const [statoSalvataggio, setStatoSalvataggio] = useState(""); // "", "salvo", "salvato"
  const [nuovaVoce, setNuovaVoce] = useState("");
  const [nuovoLinkTitolo, setNuovoLinkTitolo] = useState("");
  const [nuovoLinkUrl, setNuovoLinkUrl] = useState("");
  const [mostraLink, setMostraLink] = useState(false);
  const [caricandoFile, setCaricandoFile] = useState(false);
  const [errore, setErrore] = useState(null);
  const timer = useRef(null);
  const fileInput = useRef(null);

  useEffect(() => {
    setAppunti(blocco.pagina.appunti || "");
  }, [blocco.pagina.appunti]);

  async function salva(parziale) {
    setStatoSalvataggio("salvo");
    setErrore(null);
    try {
      const res = await fetch("/api/scuola/agenda", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, blocco: blocco.chiave, ...parziale }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Salvataggio fallito");
      onPagina(json.pagina);
      setStatoSalvataggio("salvato");
      setTimeout(() => setStatoSalvataggio(""), 1500);
    } catch (err) {
      setErrore(err.message);
      setStatoSalvataggio("");
    }
  }

  function cambiaAppunti(valore) {
    setAppunti(valore);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => salva({ appunti: valore }), 700);
  }

  function aggiungiVoce(e) {
    e.preventDefault();
    const testo = nuovaVoce.trim();
    if (!testo) return;
    setNuovaVoce("");
    salva({ checklist: [...(blocco.pagina.checklist || []), { testo, fatto: false }] });
  }

  function alternaVoce(id) {
    salva({ checklist: (blocco.pagina.checklist || []).map((v) => (v.id === id ? { ...v, fatto: !v.fatto } : v)) });
  }

  function eliminaVoce(id) {
    salva({ checklist: (blocco.pagina.checklist || []).filter((v) => v.id !== id) });
  }

  function aggiungiLink(e) {
    e.preventDefault();
    let url = nuovoLinkUrl.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
    salva({ link: [...(blocco.pagina.link || []), { titolo: nuovoLinkTitolo.trim(), url }] });
    setNuovoLinkTitolo("");
    setNuovoLinkUrl("");
    setMostraLink(false);
  }

  function eliminaLink(id) {
    salva({ link: (blocco.pagina.link || []).filter((v) => v.id !== id) });
  }

  async function caricaFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCaricandoFile(true);
    setErrore(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("data", data);
      form.append("blocco", blocco.chiave);
      const res = await fetch("/api/scuola/allegati", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Caricamento fallito");
      onPagina(json.pagina);
    } catch (err) {
      setErrore(err.message);
    } finally {
      setCaricandoFile(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function eliminaAllegato(id) {
    const res = await fetch(`/api/scuola/allegati/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (res.ok) onPagina(json.pagina);
  }

  const teams = blocco.classeInfo?.teams || "";
  const checklist = blocco.pagina.checklist || [];
  const link = blocco.pagina.link || [];
  const allegati = blocco.pagina.allegati || [];

  return (
    <div className={`agenda-blocco${blocco.classe ? "" : " agenda-blocco-giornata"}`}>
      <button type="button" className="agenda-blocco-header" onClick={() => setAperto((v) => !v)}>
        <span className="agenda-blocco-ore">{blocco.etichetta}</span>
        <span className="agenda-blocco-classe">{blocco.classe || "Appunti della giornata"}</span>
        {blocco.classeInfo?.note && <span className="agenda-blocco-nota">{blocco.classeInfo.note}</span>}
        <span className="agenda-blocco-riepilogo">
          {checklist.filter((v) => !v.fatto).length > 0 && `${checklist.filter((v) => !v.fatto).length} da fare · `}
          {allegati.length > 0 && `${allegati.length} file · `}
          {statoSalvataggio === "salvo" ? "salvo…" : statoSalvataggio === "salvato" ? "salvato ✓" : ""}
        </span>
        <span className="agenda-blocco-freccia">{aperto ? "▴" : "▾"}</span>
      </button>

      {aperto && (
        <div className="agenda-blocco-corpo">
          <div className="agenda-colonna">
            <div className="agenda-etichetta">Appunti per la lezione</div>
            <textarea
              className="agenda-appunti"
              value={appunti}
              onChange={(e) => cambiaAppunti(e.target.value)}
              placeholder={blocco.classe ? `Cosa fare oggi con la ${blocco.classe}: argomento, pagine, verifiche, assenze…` : "Note della giornata, riunioni, cose da ricordare…"}
              rows={5}
            />

            <div className="agenda-etichetta">Da fare in classe</div>
            <div className="agenda-checklist">
              {checklist.map((v) => (
                <div key={v.id} className={`scuola-todo-item${v.fatto ? " fatto" : ""}`}>
                  <input type="checkbox" checked={v.fatto} onChange={() => alternaVoce(v.id)} />
                  <span>{v.testo}</span>
                  <button type="button" className="scuola-todo-elimina" onClick={() => eliminaVoce(v.id)} aria-label="Elimina">✕</button>
                </div>
              ))}
              <form onSubmit={aggiungiVoce} className="scuola-todo-form">
                <input type="text" value={nuovaVoce} onChange={(e) => setNuovaVoce(e.target.value)} placeholder="Es. consegnare le verifiche corrette" />
                <button type="submit">Aggiungi</button>
              </form>
            </div>
          </div>

          <div className="agenda-colonna">
            <div className="agenda-etichetta">Collegamenti</div>
            <div className="agenda-link">
              {teams && (
                <a href={teams} target="_blank" rel="noopener noreferrer" className="agenda-link-riga agenda-link-teams">
                  <span className="agenda-link-icona">T</span>
                  <span>Apri la classe su Teams</span>
                </a>
              )}
              {link.map((l) => (
                <div key={l.id} className={`agenda-link-riga${eLinkTeams(l.url) ? " agenda-link-teams" : ""}`}>
                  <span className="agenda-link-icona">{eLinkTeams(l.url) ? "T" : "↗"}</span>
                  <a href={l.url} target="_blank" rel="noopener noreferrer">{l.titolo || l.url}</a>
                  <button type="button" className="scuola-todo-elimina" onClick={() => eliminaLink(l.id)} aria-label="Elimina">✕</button>
                </div>
              ))}
              {!teams && link.length === 0 && (
                <span className="review-hint">
                  Nessun link. Il link di Teams della classe si imposta una volta sola nella card &quot;Classi&quot;.
                </span>
              )}
              {mostraLink ? (
                <form onSubmit={aggiungiLink} className="agenda-link-form">
                  <input type="text" value={nuovoLinkTitolo} onChange={(e) => setNuovoLinkTitolo(e.target.value)} placeholder="Titolo (es. Riunione Teams)" />
                  <input type="text" value={nuovoLinkUrl} onChange={(e) => setNuovoLinkUrl(e.target.value)} placeholder="https://…" />
                  <div className="scuola-giorno-form-azioni">
                    <button type="submit">Aggiungi</button>
                    <button type="button" onClick={() => setMostraLink(false)}>Annulla</button>
                  </div>
                </form>
              ) : (
                <button type="button" className="scuola-giorno-aggiungi" onClick={() => setMostraLink(true)}>+ link</button>
              )}
            </div>

            <div className="agenda-etichetta">File utili</div>
            <div className="agenda-allegati">
              {allegati.map((a) => (
                <div key={a.id} className="agenda-allegato">
                  <a href={`/api/scuola/allegati/${a.id}`} target="_blank" rel="noopener noreferrer">📎 {a.nome}</a>
                  <span className="agenda-allegato-dim">{formattaDimensione(a.dimensione)}</span>
                  <button type="button" className="scuola-todo-elimina" onClick={() => eliminaAllegato(a.id)} aria-label="Elimina">✕</button>
                </div>
              ))}
              <label className={`agenda-carica-file${caricandoFile ? " disabilitato" : ""}`}>
                {caricandoFile ? "Carico…" : "+ carica un file"}
                <input ref={fileInput} type="file" onChange={caricaFile} disabled={caricandoFile} style={{ display: "none" }} />
              </label>
            </div>
          </div>
        </div>
      )}
      {errore && <p className="review-errore">{errore}</p>}
    </div>
  );
}

function hasContenuto(p) {
  return Boolean((p?.appunti || "").trim() || (p?.checklist || []).length || (p?.link || []).length || (p?.allegati || []).length);
}

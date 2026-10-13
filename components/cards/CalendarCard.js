"use client";

import { useEffect, useMemo, useState } from "react";
import { GIORNI, MESI, sameDay, toDateKey, grigliaMese } from "@/lib/calendar-grid";
import { TAVOLOZZA } from "@/lib/color-palette";
import { linkGoogleMaps } from "@/lib/maps";

// Converte un ISO string in "YYYY-MM-DDTHH:MM" per un <input type="datetime-local">
// e in "HH:MM" per <input type="time">.
function oraDa(iso) {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function CalendarCard({ googleCalendarEsito } = {}) {
  const [today, setToday] = useState(null);
  const [meseVisualizzato, setMeseVisualizzato] = useState(null);
  const [selected, setSelected] = useState(null);
  const [finestraAperta, setFinestraAperta] = useState(false);
  const [state, setState] = useState(null); // { configured, events, error }
  const [google, setGoogle] = useState(null); // { configurato, connesso, calendari, selezionati }
  const [mostraCalendari, setMostraCalendari] = useState(false);
  const [salvandoCalendari, setSalvandoCalendari] = useState(false);
  const [nuovoTitolo, setNuovoTitolo] = useState("");
  const [nuovaOra, setNuovaOra] = useState("09:00");
  const [nuovoLuogo, setNuovoLuogo] = useState("");
  const [nuovoColore, setNuovoColore] = useState(null); // null = colore automatico per parola chiave
  const [aggiungendo, setAggiungendo] = useState(false);
  const [erroreAggiunta, setErroreAggiunta] = useState(null);

  // Modifica di un evento esistente (di qualunque origine, non solo quelli
  // aggiunti da qui): un solo evento alla volta, id in editingId.
  const [editingId, setEditingId] = useState(null);
  const [modificaTitolo, setModificaTitolo] = useState("");
  const [modificaOra, setModificaOra] = useState("09:00");
  const [modificaLuogo, setModificaLuogo] = useState("");
  const [modificaColore, setModificaColore] = useState(null);
  const [modificando, setModificando] = useState(false);
  const [erroreModifica, setErroreModifica] = useState(null);

  useEffect(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    setToday(now);
    setMeseVisualizzato(new Date(now.getFullYear(), now.getMonth(), 1));
  }, []);

  useEffect(() => {
    fetch("/api/google-calendar/status")
      .then((r) => r.json())
      .then(setGoogle)
      .catch(() => setGoogle({ configurato: false, connesso: false }));
  }, [googleCalendarEsito]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") setFinestraAperta(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const griglia = useMemo(() => (meseVisualizzato ? grigliaMese(meseVisualizzato) : []), [meseVisualizzato]);

  useEffect(() => {
    if (griglia.length === 0) return;
    const start = toDateKey(griglia[0]);
    const end = toDateKey(griglia[griglia.length - 1]);
    fetch(`/api/calendar?start=${start}&end=${end}`)
      .then((r) => r.json())
      .then(setState)
      .catch(() => setState({ configured: false, events: [] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meseVisualizzato]);

  async function alternaCalendario(id) {
    if (!google) return;
    const attuali = google.selezionati || [];
    const nuovi = attuali.includes(id) ? attuali.filter((c) => c !== id) : [...attuali, id];
    if (nuovi.length === 0) return; // almeno un calendario resta sempre selezionato
    setGoogle((g) => ({ ...g, selezionati: nuovi }));
    setSalvandoCalendari(true);
    try {
      await fetch("/api/google-calendar/calendari", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calendari: nuovi }),
      });
      // Ricarica gli eventi del mese con i calendari appena scelti.
      const start = toDateKey(griglia[0]);
      const end = toDateKey(griglia[griglia.length - 1]);
      const fresh = await fetch(`/api/calendar?start=${start}&end=${end}`).then((r) => r.json());
      setState(fresh);
    } finally {
      setSalvandoCalendari(false);
    }
  }

  function cambiaMese(delta) {
    setMeseVisualizzato((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  }

  function apriGiorno(d) {
    setSelected(d);
    setFinestraAperta(true);
    setNuovoTitolo("");
    setNuovoColore(null);
    setNuovoLuogo("");
    setErroreAggiunta(null);
    setEditingId(null);
    setErroreModifica(null);
  }

  async function aggiungiEvento(e) {
    e.preventDefault();
    const titolo = nuovoTitolo.trim();
    if (!titolo || !selected) return;
    setAggiungendo(true);
    setErroreAggiunta(null);
    try {
      const res = await fetch("/api/calendar/manuali", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: titolo,
          data: `${toDateKey(selected)}T${nuovaOra}`,
          colore: nuovoColore || undefined,
          luogo: nuovoLuogo.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErroreAggiunta(json.error || "Errore nel salvataggio");
      } else {
        setState((s) => (s ? { ...s, events: [...s.events, json.evento] } : s));
        setNuovoTitolo("");
        setNuovoColore(null);
        setNuovoLuogo("");
      }
    } catch {
      setErroreAggiunta("Errore di rete");
    } finally {
      setAggiungendo(false);
    }
  }

  async function eliminaEvento(id) {
    await fetch(`/api/calendar/manuali/${id}`, { method: "DELETE" });
    setState((s) => (s ? { ...s, events: s.events.filter((e) => e.id !== id) } : s));
    if (editingId === id) setEditingId(null);
  }

  function iniziaModifica(e) {
    setEditingId(e.id);
    setModificaTitolo(e.summary);
    setModificaOra(oraDa(e.start));
    setModificaLuogo(e.luogo || "");
    setModificaColore(e.coloreManuale ? e.colore : null);
    setErroreModifica(null);
  }

  function annullaModifica() {
    setEditingId(null);
    setErroreModifica(null);
  }

  async function salvaModifica(e, giornoEvento) {
    e.preventDefault();
    const titolo = modificaTitolo.trim();
    if (!titolo || !editingId) return;
    setModificando(true);
    setErroreModifica(null);
    try {
      const res = await fetch(`/api/calendar/manuali/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: titolo,
          data: `${toDateKey(giornoEvento)}T${modificaOra}`,
          colore: modificaColore || undefined,
          luogo: modificaLuogo.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErroreModifica(json.error || "Errore nel salvataggio");
      } else {
        setState((s) => (s ? { ...s, events: s.events.map((ev) => (ev.id === editingId ? json.evento : ev)) } : s));
        setEditingId(null);
      }
    } catch {
      setErroreModifica("Errore di rete");
    } finally {
      setModificando(false);
    }
  }

  if (!today || !state || !google) {
    return (
      <section id="section-calendario" className="card span-4">
        <h3>Calendario</h3>
      </section>
    );
  }

  const eventiPerGiorno = {};
  for (const e of state.events || []) {
    if (!e.start) continue;
    const chiave = toDateKey(new Date(e.start));
    (eventiPerGiorno[chiave] ||= []).push(e);
  }

  const eventiDelGiornoSelezionato = selected
    ? (eventiPerGiorno[toDateKey(selected)] || []).slice().sort((a, b) => new Date(a.start) - new Date(b.start))
    : [];

  const eventiOggi = (eventiPerGiorno[toDateKey(today)] || []).slice().sort((a, b) => new Date(a.start) - new Date(b.start));

  return (
    <section id="section-calendario" className="card span-4">
      {googleCalendarEsito === "connesso" && <p className="cal-esito cal-esito-ok">Google Calendar collegato!</p>}
      <div className="cal-layout">
        <div className="cal-principale">
          <div className="cal-header">
            <h3 style={{ marginBottom: 0 }}>
              {MESI[meseVisualizzato.getMonth()]} {meseVisualizzato.getFullYear()}
            </h3>
            <div className="cal-nav">
              <button type="button" onClick={() => cambiaMese(-1)} aria-label="Mese precedente">‹</button>
              <button
                type="button"
                onClick={() => setMeseVisualizzato(new Date(today.getFullYear(), today.getMonth(), 1))}
              >
                Oggi
              </button>
              <button type="button" onClick={() => cambiaMese(1)} aria-label="Mese successivo">›</button>
            </div>
          </div>

          <div className="cal-google">
            {googleCalendarEsito === "negato" && (
              <span className="cal-esito cal-esito-avviso">Autorizzazione Google negata — puoi riprovare quando vuoi.</span>
            )}
            {googleCalendarEsito === "errore" && (
              <span className="cal-esito cal-esito-avviso">Il collegamento a Google Calendar non è riuscito, riprova.</span>
            )}
            {!google.configurato ? (
              <span className="cal-google-hint">
                Per vedere qui anche Google Calendar servono le credenziali in <code>.env.local</code> (vedi README). Intanto gli impegni restano salvati nell&apos;app.
              </span>
            ) : !google.connesso ? (
              <a href="/api/google-calendar/authorize" className="cal-connetti-btn">Connetti Google Calendar</a>
            ) : (
              <>
                <button type="button" className="cal-google-toggle" onClick={() => setMostraCalendari((v) => !v)}>
                  Calendari Google ({(google.selezionati || []).length}/{(google.calendari || []).length}) {mostraCalendari ? "▴" : "▾"}
                </button>
                {mostraCalendari && (
                  <div className="cal-google-lista">
                    {(google.calendari || []).map((c) => {
                      const attivo = (google.selezionati || []).includes(c.id);
                      return (
                        <button
                          key={c.id}
                          type="button"
                          className={`cal-google-chip${attivo ? " attivo" : ""}`}
                          style={attivo && c.colore ? { borderColor: c.colore, background: c.colore } : {}}
                          onClick={() => alternaCalendario(c.id)}
                          disabled={salvandoCalendari}
                          title={c.id}
                        >
                          {c.nome}{c.principale ? " (principale)" : ""}
                        </button>
                      );
                    })}
                    {(google.calendari || []).length === 0 && <span className="cal-google-hint">Nessun calendario trovato.</span>}
                    <button
                      type="button"
                      className="cal-google-hint cal-google-scollega"
                      onClick={async () => {
                        await fetch("/api/google-calendar/disconnect", { method: "DELETE" });
                        setMostraCalendari(false);
                        setGoogle((g) => ({ ...g, connesso: false, calendari: [], selezionati: [] }));
                      }}
                    >
                      Scollega
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {state.error && (
            <p style={{ color: "var(--red)", fontSize: 12 }}>Errore nel leggere Google Calendar: {state.error}</p>
          )}

          <div className="cal-grid">
            {GIORNI.map((g) => (
              <div key={g} className="cal-dow">{g}</div>
            ))}
            {griglia.map((d) => {
              const fuoriMese = d.getMonth() !== meseVisualizzato.getMonth();
              const eventiGiorno = (eventiPerGiorno[toDateKey(d)] || []).slice().sort((a, b) => new Date(a.start) - new Date(b.start));
              return (
                <button
                  type="button"
                  key={d.toISOString()}
                  className={`cal-day${fuoriMese ? " fuori-mese" : ""}${sameDay(d, today) ? " oggi" : ""}${selected && sameDay(d, selected) ? " selezionato" : ""}`}
                  onClick={() => apriGiorno(d)}
                >
                  <span className="cal-day-num">{d.getDate()}</span>
                  {eventiGiorno.length > 0 && (
                    <div className="cal-day-eventi">
                      {eventiGiorno.slice(0, 2).map((e, i) => (
                        <span key={i} className="cal-day-evento" style={{ borderColor: e.colore }}>
                          {e.summary}
                        </span>
                      ))}
                      {eventiGiorno.length > 2 && (
                        <span className="cal-day-evento-altro">+{eventiGiorno.length - 2} altri</span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="cal-oggi">
          <div className="cal-oggi-giorno">{today.getDate()}</div>
          <div className="cal-oggi-mese">
            {today.toLocaleDateString("it-IT", { weekday: "long", month: "long" })}
          </div>
          <div className="cal-oggi-lista">
            {eventiOggi.length === 0 && <div className="cal-oggi-vuoto">Nessun impegno oggi</div>}
            {eventiOggi.map((e, i) => (
              <div key={i} className="cal-oggi-evento">
                <span className="cal-dot" style={{ background: e.colore }} />
                <span className="cal-oggi-evento-ora">
                  {new Date(e.start).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className="cal-oggi-evento-titolo">{e.summary}</span>
                {e.luogo && (
                  <a
                    href={linkGoogleMaps(e.luogo)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="cal-oggi-evento-luogo"
                    title={`Apri "${e.luogo}" su Google Maps`}
                    onClick={(ev) => ev.stopPropagation()}
                  >
                    📍
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {finestraAperta && selected && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.2)", display: "flex", justifyContent: "flex-end", zIndex: 50 }}
          onClick={() => setFinestraAperta(false)}
        >
          <div
            className="card"
            style={{ width: 360, maxWidth: "100%", height: "100%", borderRadius: 0, overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cal-finestra-header">
              <h3 style={{ marginBottom: 0, textTransform: "capitalize" }}>
                {selected.toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}
              </h3>
              <button type="button" className="cal-finestra-chiudi" onClick={() => setFinestraAperta(false)} aria-label="Chiudi">
                ✕
              </button>
            </div>
            {eventiDelGiornoSelezionato.length === 0 && (
              <div className="event-row" style={{ color: "var(--text-faint)" }}>Nessun impegno</div>
            )}
            {eventiDelGiornoSelezionato.map((e, i) =>
              editingId === e.id ? (
                <form key={i} onSubmit={(ev) => salvaModifica(ev, selected)} className="cal-aggiungi-form" style={{ marginBottom: 10 }}>
                  <div className="cal-aggiungi-riga">
                    <input
                      type="text"
                      value={modificaTitolo}
                      onChange={(ev) => setModificaTitolo(ev.target.value)}
                    />
                    <input
                      type="time"
                      value={modificaOra}
                      onChange={(ev) => setModificaOra(ev.target.value)}
                    />
                  </div>
                  <div className="cal-aggiungi-riga">
                    <input
                      type="text"
                      placeholder="Luogo (opzionale)"
                      value={modificaLuogo}
                      onChange={(ev) => setModificaLuogo(ev.target.value)}
                    />
                  </div>
                  <div className="cal-colori">
                    {TAVOLOZZA.map((c) => (
                      <button
                        type="button"
                        key={c.colore}
                        className={`cal-colore-swatch${modificaColore === c.colore ? " selezionato" : ""}`}
                        style={{ background: c.colore }}
                        title={c.nome}
                        aria-label={c.nome}
                        onClick={() => setModificaColore(modificaColore === c.colore ? null : c.colore)}
                      />
                    ))}
                    <span className="cal-colore-hint">{modificaColore ? "" : "colore automatico"}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="submit" disabled={modificando} className="cal-aggiungi-submit">Salva</button>
                    <button type="button" onClick={annullaModifica} className="cal-evento-annulla">Annulla</button>
                  </div>
                  {erroreModifica && <p className="review-errore">{erroreModifica}</p>}
                </form>
              ) : (
                <div key={i} className="event-row">
                  <span className="cal-dot" style={{ background: e.colore, marginRight: 4 }} />
                  <span className="event-time">
                    {new Date(e.start).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span className="event-titolo-blocco">
                    <span className="event-titolo">{e.summary}</span>
                    {e.luogo && (
                      <a
                        href={linkGoogleMaps(e.luogo)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="cal-evento-luogo"
                      >
                        📍 {e.luogo}
                      </a>
                    )}
                  </span>
                  <button type="button" className="cal-evento-modifica" onClick={() => iniziaModifica(e)} aria-label="Modifica">
                    ✏️
                  </button>
                  <button type="button" className="cal-evento-elimina" onClick={() => eliminaEvento(e.id)} aria-label="Elimina">
                    ✕
                  </button>
                </div>
              )
            )}

            <form onSubmit={aggiungiEvento} className="cal-aggiungi-form">
              <div className="cal-aggiungi-riga">
                <input
                  type="text"
                  placeholder="Aggiungi un impegno..."
                  value={nuovoTitolo}
                  onChange={(ev) => setNuovoTitolo(ev.target.value)}
                />
                <input
                  type="time"
                  value={nuovaOra}
                  onChange={(ev) => setNuovaOra(ev.target.value)}
                />
              </div>
              <div className="cal-aggiungi-riga">
                <input
                  type="text"
                  placeholder="Luogo (opzionale)"
                  value={nuovoLuogo}
                  onChange={(ev) => setNuovoLuogo(ev.target.value)}
                />
              </div>
              <div className="cal-colori">
                {TAVOLOZZA.map((c) => (
                  <button
                    type="button"
                    key={c.colore}
                    className={`cal-colore-swatch${nuovoColore === c.colore ? " selezionato" : ""}`}
                    style={{ background: c.colore }}
                    title={c.nome}
                    aria-label={c.nome}
                    onClick={() => setNuovoColore(nuovoColore === c.colore ? null : c.colore)}
                  />
                ))}
                <span className="cal-colore-hint">{nuovoColore ? "" : "colore automatico"}</span>
              </div>
              <button type="submit" disabled={aggiungendo} className="cal-aggiungi-submit">Aggiungi</button>
            </form>
            {erroreAggiunta && <p className="review-errore">{erroreAggiunta}</p>}
          </div>
        </div>
      )}
    </section>
  );
}

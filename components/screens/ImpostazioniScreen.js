"use client";

import { useEffect, useState } from "react";

// Impostazioni: il nome mostrato nel saluto e il backup dei dati.
export default function ImpostazioniScreen() {
  const [nome, setNome] = useState("");
  const [salvato, setSalvato] = useState(false);
  const [whatsapp, setWhatsapp] = useState(null); // { whatsapp, cron }
  const [inviando, setInviando] = useState(false);
  const [esito, setEsito] = useState(null);

  useEffect(() => {
    fetch("/api/operator")
      .then((r) => r.json())
      .then((p) => setNome(p.nome || ""))
      .catch(() => {});
    fetch("/api/admin/briefing")
      .then((r) => r.json())
      .then(setWhatsapp)
      .catch(() => setWhatsapp({ whatsapp: false, cron: false }));
  }, []);

  async function mandaBriefing() {
    setInviando(true);
    setEsito(null);
    try {
      const res = await fetch("/api/admin/briefing", { method: "POST" });
      const json = await res.json();
      setEsito(json.riepilogo || json.error || "Fatto");
    } catch (err) {
      setEsito(err.message);
    } finally {
      setInviando(false);
    }
  }

  async function salva(e) {
    e.preventDefault();
    const res = await fetch("/api/operator", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome }),
    });
    if (res.ok) {
      setSalvato(true);
      setTimeout(() => setSalvato(false), 1500);
    }
  }

  return (
    <div className="screen-impostazioni">
      <section className="card span-2">
        <h3>Profilo</h3>
        <form onSubmit={salva} className="scuola-todo-form">
          <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Come vuoi essere chiamato" />
          <button type="submit">Salva</button>
          {salvato && <span className="orario-salvato">Salvato ✓</span>}
        </form>
        <p className="impostazioni-testo" style={{ marginTop: 10 }}>
          Il nome compare nel saluto in alto. Dopo averlo cambiato, ricarica la pagina.
        </p>
      </section>
      <section className="card span-2">
        <h3>WhatsApp</h3>
        {whatsapp && !whatsapp.whatsapp ? (
          <p className="impostazioni-testo">
            Non ancora collegato: servono le variabili <code>WHATSAPP_*</code> (vedi .env.example). Una volta online,
            l&apos;assistente riceve i tuoi messaggi e ogni mattina ti manda il riassunto della giornata.
          </p>
        ) : (
          <p className="impostazioni-testo">
            Collegato. Il riassunto del mattino parte da solo ogni giorno; da qui puoi mandarlo adesso per provare.
          </p>
        )}
        <button type="button" className="impostazioni-bottone" onClick={mandaBriefing} disabled={inviando || !whatsapp?.whatsapp}>
          {inviando ? "Invio…" : "Manda ora il briefing"}
        </button>
        {esito && <p className="impostazioni-testo" style={{ marginTop: 8 }}>{esito}</p>}
      </section>
      <section className="card span-2">
        <h3>Backup</h3>
        <p className="impostazioni-testo">
          Scarica un file JSON con tutti i tuoi dati: è la copia di sicurezza che ti porti dietro quando
          passerai dal computer a un database online, e la tua via d&apos;uscita da qualsiasi servizio.
        </p>
        <a href="/api/admin/export" className="impostazioni-bottone">
          Scarica backup
        </a>
      </section>
    </div>
  );
}

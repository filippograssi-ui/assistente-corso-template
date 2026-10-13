"use client";

import { Fragment, useEffect, useState } from "react";

function formatDataBreve(dataKey) {
  const [, mese, giorno] = dataKey.split("-");
  return `${giorno}/${mese}`;
}

export default function HealthCard() {
  const [stato, setStato] = useState(null); // { giorni, giorniConDati, medie }
  const [apertoData, setApertoData] = useState(null);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setStato)
      .catch(() => setStato({ giorni: [], giorniConDati: 0, medie: { calorie: 0, proteine: 0, carboidrati: 0, grassi: 0 } }));
  }, []);

  function toggleRiga(data) {
    setApertoData((cur) => (cur === data ? null : data));
  }

  return (
    <section id="section-salute" className="card span-2">
      <h3>Andamento fisico — 30 giorni</h3>

      {stato === null ? null : (
        <>
          <div className="salute-medie">
            <div className="salute-media"><span className="salute-media-val">{stato.medie.calorie}</span><span className="salute-media-label">kcal/giorno</span></div>
            <div className="salute-media"><span className="salute-media-val">{stato.medie.proteine}g</span><span className="salute-media-label">proteine</span></div>
            <div className="salute-media"><span className="salute-media-val">{stato.medie.carboidrati}g</span><span className="salute-media-label">carboidrati</span></div>
            <div className="salute-media"><span className="salute-media-val">{stato.medie.grassi}g</span><span className="salute-media-label">grassi</span></div>
          </div>
          <div className="salute-nota">medie calcolate su {stato.giorniConDati} {stato.giorniConDati === 1 ? "giorno registrato" : "giorni registrati"}</div>

          {stato.giorni.length === 0 ? (
            <p className="salute-vuoto">Nessun pasto registrato negli ultimi 30 giorni.</p>
          ) : (
            <table className="salute-table">
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Giorno</th>
                  <th>Kcal</th>
                  <th>Prot.</th>
                  <th>Carb.</th>
                  <th>Grassi</th>
                  <th>Pasti</th>
                </tr>
              </thead>
              <tbody>
                {stato.giorni.map((g) => (
                  <Fragment key={g.data}>
                    <tr key={g.data} className="salute-row" onClick={() => toggleRiga(g.data)}>
                      <td style={{ textAlign: "left" }}>{formatDataBreve(g.data)}</td>
                      <td>{g.calorie}</td>
                      <td>{g.proteine}g</td>
                      <td>{g.carboidrati}g</td>
                      <td>{g.grassi}g</td>
                      <td>{g.numPasti}</td>
                    </tr>
                    {apertoData === g.data && (
                      <tr key={`${g.data}-dettaglio`} className="salute-dettaglio-row">
                        <td colSpan={6}>
                          <div className="salute-dettaglio">
                            {g.pasti.map((p) => (
                              <div key={p.id} className="salute-pasto-riga">
                                <span className="salute-pasto-nome">{p.nome}</span>
                                <span className="salute-pasto-val">{p.calorie} kcal · {p.proteine}p · {p.carboidrati}c · {p.grassi}g{p.stimato ? " (stima)" : ""}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </section>
  );
}

"use client";

import { useEffect, useState } from "react";

// Selettore materia condiviso fra l'agenda scuola e l'orario scolastico: un
// menu con le materie di Filippo più una voce "Altro" che apre una casella di
// testo libera, così qualunque materia non elencata si può comunque scrivere.
export const MATERIE = [
  "Matematica",
  "Fisica",
  "Italiano",
  "Storia",
  "Scienze",
  "Laboratorio",
  "Filosofia",
  "Inglese",
  "Informatica",
  "Ed. Fisica",
  "Ed. Civica",
  "Debate",
  "Disegno e storia dell'arte",
];

const ALTRO = "__altro__";

export default function MateriaSelect({ value, onChange, placeholderVuoto = "— materia —", className = "", opzioni = MATERIE }) {
  // La modalità "scrittura libera" è uno stato a sé: se dipendesse solo dal
  // testo scritto, appena la casella restava vuota (es. subito dopo aver
  // scelto "Altro", prima di scrivere qualcosa) il componente tornava a
  // mostrare il menu normale invece della casella — bug segnalato da Filippo.
  const [modalitaLibera, setModalitaLibera] = useState(() => Boolean(value) && !opzioni.includes(value));

  useEffect(() => {
    // Se il valore arriva dall'esterno già impostato su una materia
    // dell'elenco (es. un altro giorno già compilato), usciamo dalla
    // modalità libera così il menu la mostra normalmente selezionata.
    if (value && opzioni.includes(value)) setModalitaLibera(false);
  }, [value, opzioni]);

  const valoreSelect = modalitaLibera ? ALTRO : opzioni.includes(value) ? value : "";

  function cambiaSelect(e) {
    const scelto = e.target.value;
    if (scelto === ALTRO) {
      setModalitaLibera(true);
    } else {
      setModalitaLibera(false);
      onChange(scelto);
    }
  }

  return (
    <div className={`materia-select ${className}`.trim()}>
      <select value={valoreSelect} onChange={cambiaSelect}>
        <option value="">{placeholderVuoto}</option>
        {opzioni.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
        <option value={ALTRO}>Altro...</option>
      </select>
      {modalitaLibera && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Scrivi la materia"
          autoFocus
        />
      )}
    </div>
  );
}

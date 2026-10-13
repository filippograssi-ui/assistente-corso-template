# Il mio assistente — versione corso (Percorso Locale)

Assistente personale per un docente, costruito con Next.js. In questa versione
gira solo sul computer (`npm run dev`) e salva tutto in `data/assistente.json`.

## Avvio

```
npm install
cp .env.example .env.local   # poi compila ANTHROPIC_API_KEY se vuoi le funzioni IA
npm run dev
```

Apri http://localhost:3000.

## Cosa c'è

- **Home**: riassunto del giorno (pulsante "Genera"), calendario (impegni nell'app
  e, se collegato, Google Calendar con scelta dei calendari — anche condivisi),
  anelli delle abitudini, cose da fare, promemoria, obiettivi.
- **Scuola**: agenda del docente — settimana in alto, sotto la pagina del giorno
  divisa per classe in base all'orario; per ogni blocco appunti, cose da fare in
  classe, link (Teams compreso) e file allegati. Orario compatto con le classi e
  elenco classi con link Teams.
- **Salute**: riassunto (pulsante), pasti, peso con grafico, allenamenti con
  importazione da Apple Salute (file `export.zip`), andamento 30 giorni.
- **Finanze**: lista spese con totali del mese e per categoria.
- **Svago**: Viaggio, Watch list, Libri, Uscite con gli amici (liste con
  suggeritore IA), Notizie (rassegna solo sugli argomenti scelti), Trend moda.
- **Review** e **Impostazioni** (nome, backup JSON).
- Barra di cattura in basso: scrivi un pensiero e finisce nella sezione giusta.

## Note tecniche

- Tutti i dati passano da `lib/store.js`; nessuna rotta tocca il file JSON direttamente.
- Nessuna scheda chiama il modello all'apertura: solo pulsanti espliciti.
- Gli allegati dell'agenda sono in `data/allegati/` (fuori da git).
- Google Calendar: OAuth 2.0, scope eventi + lettura elenco calendari.
- Apple Salute non ha un'API web: si importa l'esportazione dell'app Salute.

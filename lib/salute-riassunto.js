// Riassunto/andamento della sezione Salute — stessa idea del riassunto Home
// (prosa breve generata dal modello, nessuna ricerca web, si rigenera una
// volta al giorno dal cron del briefing insieme al resto). Nessun consiglio
// medico: solo lettura dei numeri che Filippo stesso registra (peso,
// allenamenti, streak abitudini, alimentazione media) — mai un giudizio
// sanitario o una raccomandazione di salute.
import Anthropic from "@anthropic-ai/sdk";
import { MODELLO_QUALITA } from "./models";

const SYSTEM_PROMPT = `Scrivi un riassunto quotidiano per la sezione Salute di un assistente personale,
in italiano, massimo 6-8 righe di prosa (niente elenchi puntati, niente titoli). Copre, quando i dati lo
permettono: come sta andando in generale (streak di abitudini, se sale o si è appena interrotta), gli
allenamenti fatti negli ultimi 7 giorni, l'andamento del peso se ci sono almeno due misurazioni a distanza
di tempo (in crescita/calo/stabile, senza giudizi), e l'alimentazione media dei giorni registrati di recente
(calorie e se il mix di proteine/carboidrati/grassi sembra sbilanciato in modo netto). Non sei un medico o
un nutrizionista: nessuna raccomandazione sanitaria, nessun giudizio su "dovresti perdere/mettere peso",
solo osservazioni neutre sui numeri. Se una sezione non ha dati sufficienti, saltala del tutto: non scrivere
che manca. Tono diretto, colloquiale, mai entusiasta o allarmista, mai punti esclamativi. Nessun saluto,
nessuna firma, nessuna introduzione: rispondi solo col testo.`;

export async function generaRiassuntoSalute(datiSalute) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  try {
    const client = new Anthropic({ apiKey });
    const risposta = await client.messages.create({
      model: MODELLO_QUALITA,
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: JSON.stringify(datiSalute) }],
    });
    const blocco = risposta.content.find((b) => b.type === "text");
    return blocco?.text?.trim() || null;
  } catch {
    return null;
  }
}

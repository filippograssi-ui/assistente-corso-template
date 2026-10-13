import AgendaDocenteCard from "../cards/AgendaDocenteCard";
import OrarioClassiCard from "../cards/OrarioClassiCard";
import ClassiCard from "../cards/ClassiCard";

// Scuola, versione docente: l'agenda del giorno divisa per classe (dall'orario)
// sopra, l'orario compatto e le classi (con i link Teams) sotto.
export default function ScuolaScreen() {
  return (
    <div className="screen-scuola">
      <AgendaDocenteCard />
      <OrarioClassiCard />
      <ClassiCard />
    </div>
  );
}

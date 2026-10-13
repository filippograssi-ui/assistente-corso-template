import SvagoListaCard from "../cards/SvagoListaCard";
import SvagoSuggeritoreCard from "../cards/SvagoSuggeritoreCard";

export default function SvagoViaggioScreen() {
  return (
    <div className="screen-svago">
      <SvagoListaCard
        ambito="viaggio"
        titolo="Viaggio"
        placeholder="Es. Weekend a Lisbona"
        etichettaFatto="Fatti"
        sezioneId="section-svago-viaggio"
      />
      <SvagoSuggeritoreCard ambito="viaggio" sezioneId="section-svago-viaggio-suggeritore" />
    </div>
  );
}

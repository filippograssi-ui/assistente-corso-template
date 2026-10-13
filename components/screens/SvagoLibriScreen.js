import SvagoListaCard from "../cards/SvagoListaCard";
import SvagoSuggeritoreCard from "../cards/SvagoSuggeritoreCard";

export default function SvagoLibriScreen() {
  return (
    <div className="screen-svago">
      <SvagoListaCard
        ambito="libri"
        titolo="Libri"
        placeholder="Es. Il nome della rosa"
        etichettaFatto="Letti"
        sezioneId="section-svago-libri"
      />
      <SvagoSuggeritoreCard ambito="libri" sezioneId="section-svago-libri-suggeritore" />
    </div>
  );
}

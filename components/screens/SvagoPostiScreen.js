import SvagoListaCard from "../cards/SvagoListaCard";
import SvagoSuggeritoreCard from "../cards/SvagoSuggeritoreCard";

export default function SvagoPostiScreen() {
  return (
    <div className="screen-svago">
      <SvagoListaCard
        ambito="posti"
        titolo="Uscite con gli amici"
        placeholder="Es. Trattoria da Mario"
        etichettaFatto="Provati"
        sezioneId="section-svago-posti"
      />
      <SvagoSuggeritoreCard ambito="posti" sezioneId="section-svago-posti-suggeritore" />
    </div>
  );
}

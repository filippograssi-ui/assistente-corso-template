import SvagoListaCard from "../cards/SvagoListaCard";
import SvagoSuggeritoreCard from "../cards/SvagoSuggeritoreCard";

export default function SvagoWatchlistScreen() {
  return (
    <div className="screen-svago">
      <SvagoListaCard
        ambito="watchlist"
        titolo="Watch list"
        placeholder="Es. Dune: Part Two"
        etichettaFatto="Visti"
        sezioneId="section-svago-watchlist"
      />
      <SvagoSuggeritoreCard ambito="watchlist" sezioneId="section-svago-watchlist-suggeritore" />
    </div>
  );
}

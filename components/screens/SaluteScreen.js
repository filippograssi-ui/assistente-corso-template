import SaluteRiassuntoBar from "../cards/SaluteRiassuntoBar";
import NutritionCard from "../cards/NutritionCard";
import HealthCard from "../cards/HealthCard";
import WeightCard from "../cards/WeightCard";
import WorkoutsCard from "../cards/WorkoutsCard";

export default function SaluteScreen() {
  return (
    <div className="screen-salute">
      <SaluteRiassuntoBar />
      <NutritionCard />
      <WeightCard />
      <WorkoutsCard />
      <HealthCard />
    </div>
  );
}

import AggiornamentiBar from "../cards/AggiornamentiBar";
import CalendarCard from "../cards/CalendarCard";
import HabitsCard from "../cards/HabitsCard";
import RemindersCard from "../cards/RemindersCard";
import GoalsCard from "../cards/GoalsCard";
import ToDoCard from "../cards/ToDoCard";

export default function HomeScreen({ googleCalendarEsito }) {
  return (
    <div className="screen-home">
      <AggiornamentiBar />
      <CalendarCard googleCalendarEsito={googleCalendarEsito} />
      <HabitsCard />
      <ToDoCard />
      <RemindersCard />
      <GoalsCard />
    </div>
  );
}

import ICAL from "ical.js";

// Interpreta un feed iCal ed espande gli eventi ricorrenti nell'intervallo dato.
// Parser in puro JavaScript (ical.js, il riferimento usato anche da Mozilla):
// alcune librerie più "comode" si appoggiano a funzioni native di Node che il
// bundler serverless del Percorso Completo rompe in fase di deploy.
export function parseIcsEvents(icsText, rangeStart, rangeEnd) {
  const jcalData = ICAL.parse(icsText);
  const comp = new ICAL.Component(jcalData);
  const calendarName = comp.getFirstPropertyValue("x-wr-calname") || null;
  const vevents = comp.getAllSubcomponents("vevent");
  const results = [];

  for (const vevent of vevents) {
    const event = new ICAL.Event(vevent);
    const summary = event.summary || "(senza titolo)";

    if (event.isRecurring()) {
      const iterator = event.iterator();
      let next;
      let count = 0;
      // Limite alto ma finito: una regola "ogni lunedì" senza data di fine
      // genererebbe occorrenze all'infinito se non ci fermassimo da soli.
      while ((next = iterator.next()) && count < 500) {
        count += 1;
        const occurrenceTime = next.toJSDate();
        if (occurrenceTime > rangeEnd) break;
        if (occurrenceTime < rangeStart) continue;
        const details = event.getOccurrenceDetails(next);
        results.push({
          start: details.startDate.toJSDate().toISOString(),
          end: details.endDate.toJSDate().toISOString(),
          summary: details.item.summary || summary,
          calendarName,
        });
      }
    } else {
      const start = event.startDate.toJSDate();
      const end = event.endDate.toJSDate();
      if (start <= rangeEnd && end >= rangeStart) {
        results.push({ start: start.toISOString(), end: end.toISOString(), summary, calendarName });
      }
    }
  }

  return results.sort((a, b) => new Date(a.start) - new Date(b.start));
}

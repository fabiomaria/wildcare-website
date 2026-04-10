interface EventInstance {
  title: { de?: string; en?: string };
  startDateTime: string;
  endDateTime: string;
  location: string;
  cost: string;
  slug: string;
}

/**
 * Expand weekly recurring events into flat instances for the next 8 weeks.
 * Single and block events are passed through as-is.
 */
export function expandEvents(events: any[]): EventInstance[] {
  const instances: EventInstance[] = [];
  const now = new Date();
  const eightWeeksOut = new Date(now.getTime() + 8 * 7 * 24 * 60 * 60 * 1000);

  for (const event of events) {
    if (event.recurrenceType === 'weekly' && event.recurrenceRule) {
      const dayMap: Record<string, number> = {
        sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
        thursday: 4, friday: 5, saturday: 6,
      };
      const targetDay = dayMap[event.recurrenceRule.dayOfWeek] ?? 1;
      const endDate = event.recurrenceRule.endDate
        ? new Date(event.recurrenceRule.endDate)
        : eightWeeksOut;

      const origStart = new Date(event.startDateTime);
      const origEnd = new Date(event.endDateTime);
      const durationMs = origEnd.getTime() - origStart.getTime();
      const startHour = origStart.getHours();
      const startMin = origStart.getMinutes();

      const cursor = new Date(now);
      cursor.setHours(startHour, startMin, 0, 0);
      while (cursor.getDay() !== targetDay) {
        cursor.setDate(cursor.getDate() + 1);
      }

      while (cursor <= endDate && cursor <= eightWeeksOut) {
        const instanceStart = new Date(cursor);
        const instanceEnd = new Date(instanceStart.getTime() + durationMs);
        instances.push({
          title: event.title,
          startDateTime: instanceStart.toISOString(),
          endDateTime: instanceEnd.toISOString(),
          location: event.location,
          cost: event.cost,
          slug: event.slug?.current || '',
        });
        cursor.setDate(cursor.getDate() + 7);
      }
    } else if (event.recurrenceType === 'block' && event.blockDates) {
      for (const block of event.blockDates) {
        instances.push({
          title: event.title,
          startDateTime: block.startDate,
          endDateTime: block.endDate,
          location: event.location,
          cost: event.cost,
          slug: event.slug?.current || '',
        });
      }
    } else {
      instances.push({
        title: event.title,
        startDateTime: event.startDateTime,
        endDateTime: event.endDateTime,
        location: event.location,
        cost: event.cost,
        slug: event.slug?.current || '',
      });
    }
  }

  return instances
    .filter((e) => new Date(e.startDateTime) >= now)
    .sort((a, b) => new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime());
}

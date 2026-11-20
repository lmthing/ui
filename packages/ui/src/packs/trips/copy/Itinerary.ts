import { dateLocaleOf, durationLine, numberLine, timeOfDayLine } from "../../../catalog";
import { tripsWordsFor } from "../lang";

type Stop = { title: string; time?: string | undefined; minutes?: number | undefined };
type Day = { date: string; place: string; stops: Stop[] };

export function initialItineraryDay(days: readonly { date: string }[], now: Date): number {
  const date = [now.getFullYear(), now.getMonth() + 1, now.getDate()]
    .map((field, index) => String(field).padStart(index === 0 ? 4 : 2, "0"))
    .join("-");
  return Math.max(
    0,
    days.findIndex((day) => day.date === date),
  );
}

export function itineraryDate(date: string, lang?: string): string {
  return new Intl.DateTimeFormat(dateLocaleOf(lang), {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

export function itineraryDuration(minutes: number, lang?: string): string {
  if (minutes < 60) return durationLine(minutes, lang);
  const hours = numberLine(Math.floor(minutes / 60), lang),
    rest = minutes % 60;
  return tripsWordsFor(lang).itinerary.hours(hours, rest ? numberLine(rest, lang) : undefined);
}

export function itineraryStopCopy(stop: Stop, detail: boolean, lang?: string) {
  return {
    time: stop.time ? timeOfDayLine(stop.time, lang) : undefined,
    duration: detail && stop.minutes !== undefined ? itineraryDuration(stop.minutes, lang) : undefined,
  };
}

export function readItinerary(days: Day[], detail: boolean, lang?: string): string[] {
  const words = tripsWordsFor(lang).itinerary;
  return days.map(({ date, place, stops }) =>
    words.dayLine(
      itineraryDate(date, lang),
      JSON.stringify(place),
      stops.map((stop) => {
        const { time, duration } = itineraryStopCopy(stop, detail, lang);
        return [time ?? words.untimed, JSON.stringify(stop.title), duration].filter(Boolean).join(" ");
      }),
    ),
  );
}

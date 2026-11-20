import { localeOf, numberLine, timeOfDayLine } from "../../../catalog";
import { tripsWordsFor } from "../lang";

type Place = { label: string; zone: string };

const minutesPerHour = 60;
const msPerMinute = 60_000;

function localClock(now: Date, timeZone: string, lang?: string) {
  // These parts are machine data, not display copy. Read the local date as well as the hour so
  // offsets can be compared even when the places are on opposite sides of the date line.
  const parts = new Intl.DateTimeFormat(localeOf(lang), {
    timeZone,
    calendar: "iso8601",
    numberingSystem: "latn",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((entry) => entry.type === type)!.value;
  const hour = Number(part("hour"));
  const minute =
    Date.UTC(
      Number(part("year")),
      Number(part("month")) - 1,
      Number(part("day")),
      hour,
      Number(part("minute")),
    ) / msPerMinute;
  return { minute, time: `${part("hour")}:${part("minute")}`, isDay: hour >= 6 && hour < 18 };
}

function offsetLine(value: number, lang?: string): string {
  const hours = Math.floor(Math.abs(value) / minutesPerHour);
  const minutes = Math.abs(value) % minutesPerHour;
  return tripsWordsFor(lang).clocks.offset(
    hours || !minutes ? numberLine(hours, lang) : undefined,
    minutes ? numberLine(minutes, lang) : undefined,
    value < 0 ? -1 : value > 0 ? 1 : 0,
  );
}

export function clockReadings(places: readonly Place[], now: Date, lang?: string) {
  const words = tripsWordsFor(lang).clocks;
  const clocks = places.map(({ zone }) => localClock(now, zone, lang));
  return clocks.map(({ minute, time, isDay }, index) => ({
    label: places[index]!.label,
    time: timeOfDayLine(time, lang),
    offset: index === 0 ? words.home : offsetLine(minute - clocks[0]!.minute, lang),
    daylight: isDay ? words.day : words.night,
    isDay,
  }));
}

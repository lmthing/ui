import { timeOfDayLine } from "../../../catalog";
import { learningWordsFor } from "../lang";

export const weekdays = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Weekday = (typeof weekdays)[number];
type Period = {
  day: Weekday;
  time: string;
  subject: string;
  room?: string | undefined;
  teacher?: string | undefined;
};
const weekdaysFromSunday = ["sun", ...weekdays.slice(0, -1)] as const;
const localDay = (at: Date) => weekdaysFromSunday[at.getDay()];
const minutesPerHour = 60;
const clockMinutes = (hours: number, minutes: number) => hours * minutesPerHour + minutes;

export function timetableDays<T extends Period>(
  periods: readonly T[],
  selected: Weekday | undefined,
  at?: Date,
) {
  const days = weekdays.flatMap((day) => {
    const rows = periods.filter((row) => row.day === day).sort((a, b) => a.time.localeCompare(b.time));
    return rows.length ? [{ day, rows }] : [];
  });
  const today = at && localDay(at);
  const first = days.find(({ day }) => day === selected) ?? days.find(({ day }) => day === today);
  return first ? [first, ...days.filter((day) => day !== first)] : days;
}

export function currentPeriod<T extends Period>(periods: readonly T[], at: Date): T | undefined {
  const now = clockMinutes(at.getHours(), at.getMinutes());
  return periods.reduce<T | undefined>((current, row) => {
    if (row.day !== localDay(at) || (current && row.time <= current.time)) return current;
    const [hour, minute] = row.time.split(":").map(Number);
    return clockMinutes(hour!, minute!) <= now ? row : current;
  }, undefined);
}

export function readTimetable(
  periods: readonly (Period & { id: string })[],
  selected: Weekday | undefined,
  detail: "full" | "brief",
  lang?: string,
): string[] {
  const words = learningWordsFor(lang).timetable;
  return [
    words.picker,
    ...timetableDays(periods, selected).flatMap(({ day, rows }) => [
      words.reading([words.days[day].name, words.days[day].short]),
      ...rows.map((row) => {
        const time = timeOfDayLine(row.time, lang);
        const details = detail === "full" ? [row.room, row.teacher] : [];
        return `${row.id}: ${words.reading([time, row.subject, ...details])}`;
      }),
    ]),
  ];
}

import { appointmentDate, timeOfDayLine, wordsFor } from "../../../catalog";
import { teamWordsFor } from "../lang";

type Shift = { person: number; day: number; from: string; to: string; role?: string | undefined };
type Schedule = { week: string; people: readonly { name: string }[]; shifts: readonly Shift[] };
const oneLine = (value: string) => value.replace(/[\r\n\u2028\u2029]+/g, " ");

export const rosterPortrait = (name: string, photo: string) =>
  photo === "lib:people" ? { initials: Array.from(name)[0]! } : { photo };

export const rosterWeek = (week: string, lang?: string) =>
  teamWordsFor(lang).roster.week(appointmentDate(week, lang));

export function rosterDays(shifts: readonly Shift[], lang?: string) {
  const { weekdayNames, weekdayShort } = wordsFor(lang);
  const covered = new Set(shifts.map(({ day }) => day));
  return weekdayNames.map((label, day) => ({
    id: String(day),
    label,
    short: weekdayShort[day]!,
    uncovered: !covered.has(day),
  }));
}

export function rosterCover(days: ReturnType<typeof rosterDays>, lang?: string) {
  const gaps = days.filter(({ uncovered }) => uncovered).map(({ short }) => short);
  return gaps.length ? teamWordsFor(lang).roster.coverReading(gaps) : undefined;
}

/** Compare calendar dates, not elapsed time: a local day can be 23 or 25 hours. */
export function rosterToday(week: string, now: Date) {
  const localDate = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const day = (localDate - Date.parse(`${week}T00:00:00Z`)) / 86_400_000;
  return day >= 0 && day < 7 ? String(day) : undefined;
}

export function shiftsByPerson<T extends Shift>(people: Schedule["people"], shifts: readonly T[]) {
  const rows = people.map(() => [] as { shift: T; index: number }[]);
  shifts.forEach((shift, index) => rows[shift.person]?.push({ shift, index }));
  for (const row of rows)
    row.sort((a, b) => a.shift.day - b.shift.day || a.shift.from.localeCompare(b.shift.from));
  return rows;
}

export function rosterShift({ from, to, role }: Shift, brief: boolean, lang?: string) {
  const words = teamWordsFor(lang).roster;
  const time = words.time(timeOfDayLine(from, lang), timeOfDayLine(to, lang));
  return { time, role: brief || !role ? undefined : oneLine(role) };
}

export function rosterReading(input: unknown, _state: unknown, lang?: string): string[] {
  const { week, people, shifts, detail } = input as Schedule & { detail?: "full" | "brief" };
  const words = teamWordsFor(lang).roster;
  if (!shifts.length) return [rosterWeek(week, lang), words.empty];
  const days = rosterDays(shifts, lang);
  const rows = shiftsByPerson(people, shifts).map((schedule, person) => {
    const details = schedule.map(({ shift, index }) => {
      const { time, role } = rosterShift(shift, detail === "brief", lang);
      return words.shiftReading(days[shift.day]!.short, words.shift(time, role), `r${index + 1}`);
    });
    return words.personReading(oneLine(people[person]!.name), details);
  });
  const heading = words.columnsReading(
    words.staff,
    days.map(({ short }) => short),
  );
  const cover = rosterCover(days, lang);
  // The shared reader appends actions, but staff summaries have their own lines.
  return [[rosterWeek(week, lang), heading, ...rows, ...(cover ? [cover] : []), words.scrollHint].join("\n")];
}

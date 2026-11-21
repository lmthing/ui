import {
  appointmentDate,
  clockLine,
  dateLocaleOf,
  numberLine,
  timeOfDayLine,
  type DeviceData,
  type StateName,
} from "../../../catalog";
import { projectsWordsFor } from "../lang";
import { dayMs, dayOf } from "../seeds";
import { offsetAt, timeLogZone, zoneFormat } from "./TimeLog-clock";

export type TimeEntry = {
  title: string;
  start: string;
  end: string;
  billable: boolean;
  note?: string | undefined;
  goto?: string | undefined;
};
type Log<T> = {
  week: string;
  day?: string | undefined;
  detail: "full" | "brief";
  entries: readonly T[];
  weekMs?: number | undefined;
  timerRunning?: boolean | undefined;
  timerSeconds?: number | undefined;
  projectRef?: string | undefined;
  addGoto?: string | undefined;
};
const isoDay = (day: number) => new Date(day * dayMs).toISOString().slice(0, 10);
const elapsed = ({ start, end }: TimeEntry) => Date.parse(end) - Date.parse(start);
export const weekElapsed = (entries: readonly TimeEntry[]) =>
  entries.reduce((ms, row) => ms + elapsed(row), 0);
const endsAtMidnight = (end: string) => /^00:00:00(?:\.0+)?(?:Z|[+-])/.test(end.slice(11));
export const appearsOn = ({ start, end }: Pick<TimeEntry, "start" | "end">, day: string) =>
  day >= start.slice(0, 10) && (day < end.slice(0, 10) || (day === end.slice(0, 10) && !endsAtMidnight(end)));

export function validTimeEntries({ week, entries }: Pick<Log<TimeEntry>, "week" | "entries">) {
  const first = dayOf(week);
  const sorted = [...entries].sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  return sorted.every(({ start, end }, index) => {
    const startDay = dayOf(start.slice(0, 10));
    const endDay = dayOf(end.slice(0, 10));
    return (
      startDay >= first &&
      startDay < first + 7 &&
      endDay >= startDay &&
      (endDay < first + 7 || (endDay === first + 7 && endsAtMidnight(end))) &&
      Date.parse(start) < Date.parse(end) &&
      (!index || Date.parse(sorted[index - 1]!.end) <= Date.parse(start))
    );
  });
}

const suffix = (timestamp: string) => (timestamp.endsWith("Z") ? "+00:00" : timestamp.slice(-6));
function daySlices(row: TimeEntry, zone?: Intl.DateTimeFormat) {
  const start = Date.parse(row.start),
    end = Date.parse(row.end);
  const first = dayOf(row.start.slice(0, 10)),
    last = dayOf(row.end.slice(0, 10));
  const from = suffix(row.start),
    to = suffix(row.end);
  const matches = zone && offsetAt(start, zone) === from && offsetAt(end, zone) === to;
  const before = (day: number) => {
    const midnight = `${isoDay(day)}T00:00:00`;
    const candidate = Date.parse(`${midnight}${day === last ? to : from}`);
    const offset = matches ? offsetAt(candidate, zone) : undefined;
    return offset ? Date.parse(`${midnight}${offset}`) : candidate;
  };
  let lastCut = start;
  return Array.from({ length: last - first + 1 }, (_, index) => {
    const day = first + index;
    const cut = day === last ? end : Math.max(lastCut, Math.min(end, before(day + 1)));
    const part = { day: isoDay(day), ms: cut - lastCut };
    lastCut = cut;
    return part;
  }).filter(({ ms }) => ms > 0);
}

function logDuration(ms: number, lang?: string) {
  const seconds = Math.floor(ms / 1000);
  const hours = Math.floor(seconds / 3600),
    minutes = Math.floor(seconds / 60) % 60;
  return projectsWordsFor(lang).timeLog.duration(
    hours ? numberLine(hours, lang) : "",
    minutes || (!hours && !seconds) ? numberLine(minutes, lang) : "",
    seconds % 60 ? numberLine(seconds % 60, lang) : "",
  );
}

export function timeLogCopy<T extends TimeEntry>(input: Log<T>, lang?: string, data: DeviceData = {}) {
  const words = projectsWordsFor(lang).timeLog;
  const zone = zoneFormat(timeLogZone(data));
  const weekday = new Intl.DateTimeFormat(dateLocaleOf(lang), {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  const groups = new Map<string, { ms: number; rows: T[] }>();
  if (input.day) groups.set(input.day, { ms: 0, rows: [] });
  for (const row of [...input.entries].sort((a, b) => Date.parse(a.start) - Date.parse(b.start))) {
    const slices = daySlices(row, zone).filter(({ day }) => !input.day || day === input.day);
    for (const [index, { day, ms }] of slices.entries()) {
      const group = groups.get(day) ?? { ms: 0, rows: [] };
      group.ms += ms;
      if (!index) group.rows.push(row);
      groups.set(day, group);
    }
  }
  const time = (stamp: string) => timeOfDayLine(stamp.slice(11, 16), lang);
  return {
    week: words.week(appointmentDate(input.week, lang)),
    total: logDuration(input.weekMs ?? weekElapsed(input.entries), lang),
    timer: input.timerRunning ? clockLine(input.timerSeconds ?? 0, lang) : undefined,
    days: [...groups]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, group]) => ({
        day,
        date: weekday.format(dayOf(day) * dayMs),
        total: logDuration(group.ms, lang),
        rows: group.rows.map((row) => ({
          row,
          start: time(row.start),
          end: time(row.end),
          duration: logDuration(elapsed(row), lang),
          billable: row.billable ? words.billable : words.nonBillable,
          note: input.detail === "full" ? row.note : undefined,
        })),
      })),
  };
}

export function timeLogReading(input: unknown, state: StateName, lang?: string, data?: DeviceData) {
  if (state !== "filled" && state !== "success") return [];
  const log = input as Log<TimeEntry & { id: string }>;
  const copy = timeLogCopy(log, lang, data);
  const w = projectsWordsFor(lang).timeLog;
  return [
    copy.week,
    `${w.weekTotal}${w.separator}${copy.total}`,
    ...(copy.timer ? [copy.timer, w.stop, w.discard] : log.projectRef ? [w.start] : []),
    ...(log.addGoto ? [w.add] : []),
    ...(log.weekMs ? [w.export] : []),
    ...(state === "success" ? [w.saved] : []),
    ...copy.days.flatMap(({ date, total, rows }) => [
      `${date}${w.separator}${total}`,
      ...rows.map(({ row, duration, billable, note }) =>
        [`${row.id}: ${row.title}`, `${row.start}${w.range}${row.end}`, duration, billable, note]
          .filter(Boolean)
          .join(w.separator),
      ),
    ]),
  ];
}

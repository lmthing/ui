import { clip, dateLocaleOf, type StateName } from "../../../catalog";
import { projectsWordsFor } from "../lang";
import { dayMs, dayOf } from "../seeds";

type Entry = { title: string; goto?: string | undefined };
type Task = Entry & { kind: "task"; taskRef: string; start: string; end: string; after: string[] };
type Gate = Entry & { kind: "gate"; due: string };
type Target = Task | Gate;
type Schedule<T extends Target = Target> = {
  from: string;
  to: string;
  style: "week" | "month";
  detail: "full" | "brief";
  targets: readonly T[];
};
type Item = Target & { id: string };
const last = (entry: Target) => (entry.kind === "task" ? entry.end : entry.due);
const first = (entry: Target) => (entry.kind === "task" ? entry.start : entry.due);
// The pinned rail is narrow. Full titles stay in the addressed list beneath it.
const railTitle = (title: string, words: ReturnType<typeof projectsWordsFor>["gantt"]) =>
  title.length > 11 ? words.clipped(clip(title, 9)) : title;
const visible = (entry: Target, { from, to }: Schedule) => first(entry) <= to && last(entry) >= from;
const tasksByRef = <T extends Target>(targets: readonly T[]) =>
  new Map(targets.flatMap((entry) => (entry.kind === "task" ? [[entry.taskRef, entry] as const] : [])));
const conflicts = (task: Task, tasks: ReadonlyMap<string, Target>) =>
  task.after.some((ref) => {
    const previous = tasks.get(ref);
    return previous?.kind === "task" && previous.end >= task.start;
  });

function dateLabels(lang?: string, dayOnly = false) {
  const fmt = new Intl.DateTimeFormat(dateLocaleOf(lang), {
    day: "numeric",
    ...(dayOnly ? {} : { month: "short" }),
    timeZone: "UTC",
  });
  return (day: number) => fmt.format(day * dayMs);
}

function scale(input: Schedule, lang?: string) {
  const from = dayOf(input.from),
    count = dayOf(input.to) - from + 1;
  const step = input.style === "month" ? 7 : 1;
  const length = Math.ceil(count / step);
  const label = dateLabels(lang, step === 1 && input.from.slice(0, 7) === input.to.slice(0, 7));
  const columns = Array.from({ length }, (_, index) => {
    const day = from + index * step;
    return { id: String(day), label: label(day) };
  });
  // Leave unused days in the last week blank so a day has the same width in every column.
  const x = (day: number) => Math.min(count, Math.max(0, day - from)) / (length * step);
  return { columns, x };
}

/** Derive marks from the original dates; a scale change never rewrites the schedule. */
export function ganttChart(input: Schedule<Item>, lang?: string) {
  const { columns, x } = scale(input, lang);
  const { gantt: words } = projectsWordsFor(lang);
  const tasks = tasksByRef(input.targets);
  const shown = input.targets.filter((entry) => visible(entry, input));
  const rows = shown.flatMap((entry) =>
    entry.kind === "task"
      ? [
          {
            id: entry.id,
            label: railTitle(entry.title, words),
            start: x(dayOf(entry.start)),
            end: x(dayOf(entry.end) + 1),
            clippedStart: entry.start < input.from,
            clippedEnd: entry.end > input.to,
            conflict: conflicts(entry, tasks),
            ...(entry.goto ? { target: { part: "root" } } : {}),
          },
        ]
      : [],
  );
  const gates = shown.flatMap((entry) =>
    entry.kind === "gate"
      ? [
          {
            id: entry.id,
            label: railTitle(entry.title, words),
            at: (x(dayOf(entry.due)) + x(dayOf(entry.due) + 1)) / 2,
            ...(entry.goto ? { target: { part: "root" } } : {}),
          },
        ]
      : [],
  );
  const drawn = new Set(rows.map(({ id }) => id));
  const links = shown.flatMap((entry) =>
    entry.kind === "task"
      ? entry.after.flatMap((ref) => {
          const from = tasks.get(ref)?.id;
          return from && drawn.has(from) ? [{ from, to: entry.id }] : [];
        })
      : [],
  );
  return { columns, rows, gates, links };
}

export function ganttCopy<T extends Target>(input: Schedule<T>, lang?: string) {
  const { gantt: words } = projectsWordsFor(lang);
  const date = dateLabels(lang);
  const year = new Intl.DateTimeFormat(dateLocaleOf(lang), {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const range = (start: string, end: string) => {
    const label =
      start.slice(0, 4) === end.slice(0, 4) && start.slice(0, 4) === input.from.slice(0, 4)
        ? date
        : (day: number) => year.format(day * dayMs);
    return words.dates(label(dayOf(start)), label(dayOf(end)));
  };
  const tasks = tasksByRef(input.targets);
  const entries = input.targets.map((entry) => {
    const inRange = visible(entry, input);
    const dates = input.detail === "full" ? range(first(entry), last(entry)) : undefined;
    const after =
      input.detail === "full" && entry.kind === "task" && entry.after.length
        ? words.after(entry.after.map((ref) => tasks.get(ref)?.title ?? ref))
        : undefined;
    return {
      entry,
      inRange,
      dates,
      after,
      conflict: after && entry.kind === "task" && conflicts(entry, tasks),
    };
  });
  return {
    details: input.detail === "brief" ? words.entries : words.details,
    range: words.dates(
      input.from.slice(0, 4) === input.to.slice(0, 4)
        ? date(dayOf(input.from))
        : year.format(dayOf(input.from) * dayMs),
      year.format(dayOf(input.to) * dayMs),
    ),
    noDates: entries.some(({ inRange }) => inRange) ? undefined : words.noDates,
    entries,
  };
}

export function ganttReading(input: unknown, state: StateName, lang?: string) {
  if (state !== "filled") return [];
  const schedule = input as Schedule;
  const copy = ganttCopy(schedule, lang);
  const { gantt: words } = projectsWordsFor(lang);
  return [
    copy.range,
    words.week,
    words.month,
    copy.details,
    ...(copy.noDates ? [copy.noDates] : scale(schedule, lang).columns.map(({ label }) => label)),
    ...copy.entries.map(({ entry, dates, after, conflict, inRange }, index) => {
      const short = railTitle(entry.title, words);
      // Retain the exact schedule date wherever the chart omits or clips it.
      const original =
        dates && (first(entry) < schedule.from || last(entry) > schedule.to)
          ? words.dates(first(entry), last(entry))
          : undefined;
      return [
        `r${index + 1}: ${entry.title}`,
        dates,
        after,
        conflict && words.conflict,
        !inRange && words.outside,
        original,
        inRange && short !== entry.title && short,
      ]
        .filter(Boolean)
        .join(words.separator);
    }),
  ];
}

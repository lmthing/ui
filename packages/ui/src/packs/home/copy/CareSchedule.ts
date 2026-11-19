import { dateLocaleOf, numberLine, pluralForm, type repeatOptions } from "../../../catalog";
import { homeWordsFor } from "../lang";

type CareRepeat = (typeof repeatOptions)[number];
type CareSeed = { last: string; repeat: CareRepeat; every: number };

export const { careLabels } = homeWordsFor();

export function careToday(now = new Date()): string {
  return [
    String(now.getFullYear()).padStart(4, "0"),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

/** Add calendar units from the last completion, clamping short months instead of rolling over. */
export function nextCareDate({ last, repeat, every }: CareSeed): string | undefined {
  if (repeat === "never") return undefined;
  const date = new Date(`${last}T00:00:00Z`);
  if (repeat === "daily" || repeat === "weekly") {
    date.setUTCDate(date.getUTCDate() + every * (repeat === "daily" ? 1 : 7));
  } else if (repeat === "weekdays") {
    for (let left = every; left > 0;) {
      date.setUTCDate(date.getUTCDate() + 1);
      const weekday = date.getUTCDay();
      if (weekday !== 0 && weekday !== 6) left--;
    }
  } else {
    const day = date.getUTCDate();
    date.setUTCMonth(date.getUTCMonth() + every * (repeat === "monthly" ? 1 : 12), 1);
    const end = new Date(date);
    end.setUTCMonth(end.getUTCMonth() + 1, 0);
    date.setUTCDate(Math.min(day, end.getUTCDate()));
  }
  return date.getUTCFullYear() <= 9999 ? date.toISOString().slice(0, 10) : undefined;
}

export function careLines(seed: CareSeed, today = careToday(), lang?: string) {
  const words = homeWordsFor(lang);
  const labels = words.careLabels;
  const dates = new Intl.DateTimeFormat(dateLocaleOf(lang), {
    day: "numeric",
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  });
  const format = (label: string, date: string) =>
    words.careDate(label, dates.format(new Date(`${date}T00:00:00Z`)));
  const next = nextCareDate(seed);
  const overdue = next !== undefined && next < today;
  return {
    repeat: words.careRepeat(seed.repeat, numberLine(seed.every, lang), pluralForm(seed.every, lang)),
    last: format(labels.last, seed.last),
    next: !next
      ? labels.noNext
      : next === today
        ? labels.today
        : format(overdue ? labels.overdue : labels.next, next),
    tone: overdue ? "bad" : next === today ? "accent" : "muted",
  } as const;
}

type NamedTask = { title: string; for?: string | undefined };

export function careTaskLabel(task: NamedTask): string {
  return task.for ? `${task.title} · ${task.for}` : task.title;
}

export function careReading(tasks: readonly (CareSeed & NamedTask)[], lang?: string): string[] {
  const today = careToday();
  return tasks.map((task) => {
    const { repeat, last, next } = careLines(task, today, lang);
    return [careTaskLabel(task), repeat, last, next, homeWordsFor(lang).careLabels.done].join(" · ");
  });
}

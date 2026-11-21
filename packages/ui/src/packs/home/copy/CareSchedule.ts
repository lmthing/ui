import { dateLocaleOf, numberLine, pluralForm, type repeatOptions } from "../../../catalog";
import { homeWordsFor } from "../lang";

type CareRepeat = (typeof repeatOptions)[number];
export const careCategories = ["pet", "plant", "car", "house"] as const;
type CareCategory = (typeof careCategories)[number];
type CareSeed = { last: string; repeat: CareRepeat; every: number };

export const { careLabels } = homeWordsFor();

export function careCategory(category: CareCategory | undefined, lang?: string) {
  return category && homeWordsFor(lang).careCategory[category];
}

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

type NamedTask = { title: string; for?: string | undefined; category?: CareCategory | undefined };

export function careTaskLabel(task: NamedTask, lang?: string): string {
  return [task.title, task.for, careCategory(task.category, lang)]
    .filter(Boolean)
    .join(homeWordsFor(lang).careLabels.categorySeparator);
}

export function careReading(tasks: readonly (CareSeed & NamedTask)[], lang?: string): string[] {
  const today = careToday();
  const { careLabels: labels } = homeWordsFor(lang);
  return tasks.map((task) => {
    const { repeat, last, next } = careLines(task, today, lang);
    return [careTaskLabel(task, lang), repeat, last, next, labels.done].join(" · ");
  });
}

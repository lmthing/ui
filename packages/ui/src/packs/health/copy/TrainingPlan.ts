import { numberLine, wordsFor, type StateName } from "../../../catalog";
import { healthWordsFor } from "../lang";

type Day = { week: number; day: number; label: string; minutes: number; rest: boolean; done: boolean };
type Plan = {
  title: string;
  weeks: number;
  currentWeek: number;
  style: "week" | "list";
  days: readonly Day[];
  detail?: "full" | "brief" | undefined;
};
type Count = { count: number; done: number };

function countWorkouts(days: readonly Day[]): Count {
  return days.reduce(
    (progress, day) =>
      day.rest ? progress : { count: progress.count + 1, done: progress.done + Number(day.done) },
    { count: 0, done: 0 },
  );
}

export function planView<D extends Day>(p: Omit<Plan, "days" | "title"> & { days: D[] }) {
  const allWeeks = Array.from({ length: p.weeks }, (_, index) => index + 1);
  return {
    canSelectWeek: p.style === "week" && p.weeks > 1,
    weekChoices: allWeeks.map((value) => ({ value, label: String(value) })),
    programProgress: countWorkouts(p.days),
    weeklyProgress: allWeeks.map((week) => countWorkouts(p.days.filter((day) => day.week === week))),
    days: p.days.map((day) => ({ ...day, visible: p.style === "list" || day.week === p.currentWeek })),
  };
}

export function planOrder<D extends Day>(days: readonly D[]) {
  return [...days].sort((a, b) => a.week - b.week || a.day - b.day);
}

export function planCount(count: Count, lang?: string) {
  const w = healthWordsFor(lang).training;
  return count.count
    ? w.completed(numberLine(count.done, lang), numberLine(count.count, lang))
    : w.noWorkouts;
}

export function planDay(day: Day, detail: Plan["detail"], lang?: string) {
  const w = healthWordsFor(lang).training;
  return {
    weekday: wordsFor(lang).weekdayShort[day.day - 1]!,
    minutes: !day.rest && detail !== "brief" ? w.minutes(numberLine(day.minutes, lang)) : undefined,
    status: day.rest ? w.rest : day.done ? w.done : w.pending,
  };
}

export function planReading(
  p: Plan & Pick<ReturnType<typeof planView>, "programProgress" | "weeklyProgress">,
  state: StateName,
  lang?: string,
): string[] {
  const w = healthWordsFor(lang).training;
  if (state !== "filled" && state !== "success") return [];
  const visible = planOrder(
    p.style === "list" ? p.days : p.days.filter(({ week }) => week === p.currentWeek),
  );
  const weeks = p.style === "list" ? [...new Set(visible.map(({ week }) => week))] : [p.currentWeek];
  return [
    ...(state === "success" ? [w.success] : []),
    w.line([w.program, planCount(p.programProgress, lang)]),
    ...(p.style === "week" && p.weeks > 1
      ? Array.from({ length: p.weeks }, (_, index) => w.week(numberLine(index + 1, lang)))
      : []),
    ...weeks.flatMap((week) => [
      w.line([w.week(numberLine(week, lang)), planCount(p.weeklyProgress[week - 1]!, lang)]),
      ...visible
        .filter((day) => day.week === week)
        .map((day) => {
          const { weekday, minutes, status } = planDay(day, p.detail, lang);
          return w.line([weekday, day.label, ...(minutes ? [minutes] : []), status]);
        }),
    ]),
  ];
}

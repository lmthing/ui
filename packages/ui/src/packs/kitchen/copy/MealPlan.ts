import { appointmentDate, wordsFor } from "../../../catalog";
import { kitchenWordsFor } from "../lang";
import { kcalLine } from "./FoodLog";

export const { mealPlanLabels } = kitchenWordsFor();
export function mealPlanDaysFor(lang?: string) {
  const { weekdayNames, weekdayShort } = wordsFor(lang);
  return weekdayNames.map((label, day) => ({ id: String(day), label, short: weekdayShort[day]! }));
}
export const mealPlanDays = mealPlanDaysFor();
type MealCell = {
  id?: string;
  day: number;
  meal: keyof Omit<typeof mealPlanLabels, "add">;
  title?: string;
  kcal?: number | undefined;
};
export function mealPlanTotals(cells: readonly { day: number; kcal?: number | undefined }[], lang?: string) {
  const sums = new Map<number, number>();
  const incomplete = new Set<number>();
  for (const { day, kcal } of cells) {
    if (kcal === undefined) incomplete.add(day);
    else sums.set(day, (sums.get(day) ?? 0) + kcal);
  }
  for (const day of incomplete) sums.delete(day);
  return new Map([...sums].map(([day, sum]) => [day, kcalLine(sum, lang)]));
}
export const mealPlanWeek = (week: string, lang?: string): string =>
  kitchenWordsFor(lang).mealPlanWeek(appointmentDate(week, lang));
export function mealPlanReading(week: string, cells: readonly MealCell[], lang?: string): string[] {
  const { mealPlanLabels } = kitchenWordsFor(lang);
  const { weekdayNames } = wordsFor(lang);
  const totals = week
    ? mealPlanTotals(
        cells.filter((cell) => cell.title !== undefined),
        lang,
      )
    : new Map();
  return [
    ...(week ? [mealPlanWeek(week, lang)] : []),
    ...weekdayNames.flatMap((day, index) => (totals.has(index) ? [`${day}: ${totals.get(index)}`] : [])),
    ...cells.map(
      (cell, index) =>
        `${cell.id ?? `r${index + 1}`}: ${weekdayNames[cell.day]} ${mealPlanLabels[cell.meal]} · ${cell.title ?? mealPlanLabels.add}`,
    ),
  ];
}
/** Highlight only a local calendar date that belongs to the supplied Monday-first week. */
export function mealPlanToday(week: string, now = new Date()): string | undefined {
  const localDate = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const day = (localDate - new Date(`${week}T00:00:00Z`).getTime()) / 86400000;
  return day >= 0 && day < 7 ? String(day) : undefined;
}

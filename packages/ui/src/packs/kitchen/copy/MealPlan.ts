import { appointmentDate, wordsFor } from "../../../catalog";
import { kitchenWordsFor } from "../lang";

export const { mealPlanLabels } = kitchenWordsFor();
export function mealPlanDaysFor(lang?: string) {
  const { weekdayNames, weekdayShort } = wordsFor(lang);
  return weekdayNames.map((label, day) => ({ id: String(day), label, short: weekdayShort[day]! }));
}
export const mealPlanDays = mealPlanDaysFor();
type MealCell = { id?: string; day: number; meal: keyof Omit<typeof mealPlanLabels, "add">; title?: string };
export const mealPlanWeek = (week: string, lang?: string): string =>
  kitchenWordsFor(lang).mealPlanWeek(appointmentDate(week, lang));
export function mealPlanReading(week: string, cells: readonly MealCell[], lang?: string): string[] {
  const { mealPlanLabels } = kitchenWordsFor(lang);
  const { weekdayNames } = wordsFor(lang);
  return [
    ...(week ? [mealPlanWeek(week, lang)] : []),
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

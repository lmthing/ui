import { appointmentDate, weekdayNames } from "../../../catalog";

export const mealPlanLabels = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
  add: "Add",
} as const;
type MealCell = { id?: string; day: number; meal: keyof Omit<typeof mealPlanLabels, "add">; title?: string };
export const mealPlanWeek = (week: string): string => `Week of ${appointmentDate(week)}`;
export function mealPlanReading(week: string, cells: readonly MealCell[]): string[] {
  return [
    ...(week ? [mealPlanWeek(week)] : []),
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

import { kitchenWordsFor } from "../lang";
import { goalLine, kitchenItemLine, percentLine, totalLine, numberLine } from "../../../catalog";

type MealName = "breakfast" | "lunch" | "dinner" | "snack";
type Meal = {
  meal: MealName;
  items: readonly { name: string; kcal: number; amount?: string | undefined }[];
};

export const foodLogLabels = { ...kitchenWordsFor().foodLogLabels, share: percentLine };

function withKcal(value: string, lang?: string): string {
  const words = kitchenWordsFor(lang);
  return words.kcalLine(value, words.kcalUnit);
}
export const kcalLine = (value: number, lang?: string): string => withKcal(numberLine(value, lang), lang);
export const targetLine = (target: number, lang?: string): string => withKcal(goalLine(target, lang), lang);
export const foodLogTotal = (meals: readonly Meal[]): number =>
  meals.reduce((sum, meal) => sum + meal.items.reduce((subtotal, item) => subtotal + item.kcal, 0), 0);
export function foodLogGroups<T>(meals: readonly Meal[], rows: readonly T[]): T[][] {
  let start = 0;
  return meals.map((meal) => {
    const group = rows.slice(start, start + meal.items.length + 1);
    start += group.length;
    return group;
  });
}

export function foodLogRead(
  {
    meals,
    target,
  }: {
    meals: readonly Meal[];
    target?: number | undefined;
  },
  lang?: string,
): string[] {
  const { foodLogLabels, kcalUnit } = kitchenWordsFor(lang);
  const total = foodLogTotal(meals);
  let index = 0;
  return [
    totalLine(total, kcalUnit, lang),
    ...(target === undefined
      ? []
      : [targetLine(target, lang), foodLogLabels.target, percentLine(total, target, lang)]),
    ...meals.flatMap((meal) => [
      kitchenItemLine(index++, foodLogLabels.meals[meal.meal]),
      ...meal.items.map((item) =>
        kitchenItemLine(
          index++,
          `${item.name} ${kcalLine(item.kcal, lang)}${item.amount ? ` · ${item.amount}` : ""}`,
        ),
      ),
    ]),
  ];
}

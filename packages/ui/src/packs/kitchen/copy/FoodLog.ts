import { goalLine, kitchenItemLine, percentLine, totalLine } from "../../../catalog";

type MealName = "breakfast" | "lunch" | "dinner" | "snack";
type Meal = {
  meal: MealName;
  items: readonly { name: string; kcal: number; amount?: string | undefined }[];
};

export const foodLogLabels = {
  meals: { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snack" },
  target: "Daily target",
  add: (meal: MealName): string => `Add food to ${meal}`,
  share: percentLine,
} as const;

export const kcalLine = (value: number): string => `${value} kcal`;
export const targetLine = (target: number): string => `${goalLine(target)} kcal`;
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

export function foodLogRead({
  meals,
  target,
}: {
  meals: readonly Meal[];
  target?: number | undefined;
}): string[] {
  const total = foodLogTotal(meals);
  let index = 0;
  return [
    totalLine(total, "kcal"),
    ...(target === undefined ? [] : [targetLine(target), foodLogLabels.target, percentLine(total, target)]),
    ...meals.flatMap((meal) => [
      kitchenItemLine(index++, foodLogLabels.meals[meal.meal]),
      ...meal.items.map((item) =>
        kitchenItemLine(
          index++,
          `${item.name} ${kcalLine(item.kcal)}${item.amount ? ` · ${item.amount}` : ""}`,
        ),
      ),
    ]),
  ];
}

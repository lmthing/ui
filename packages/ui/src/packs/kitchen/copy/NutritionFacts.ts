import { numberLine, percentLine, type StateName } from "../../../catalog";
import { kitchenWordsFor } from "../lang";

type Macro = (typeof nutritionMacros)[number];
type Tone = "neutral" | "good" | "warn" | "bad";
type Nutrient = { label: string; amount: number; unit: string; tone: Tone };
type Nutrition = Record<Macro, number> & {
  detail: "full" | "brief";
  calories: number;
  servings: number;
  servingLabel: string;
  nutrients: readonly Nutrient[];
  allergens: readonly string[];
};
export const nutritionBounds = { min: 0.25, max: 12, step: 0.25 } as const;
// Keep the sum of three scaled macros finite even at the largest accepted input.
export const nutritionAmountMax = Number.MAX_VALUE / (4 * nutritionBounds.max);
export const nutritionMacros = ["protein", "carbs", "fat"] as const;
const scaled = (value: number, servings: number) => Number((value * servings).toFixed(2));

export function nutritionDisplay(input: Nutrition, lang?: string) {
  const { nutritionFacts: words, kcalUnit } = kitchenWordsFor(lang);
  const macro = (key: Macro) => ({ label: words[key], value: scaled(input[key], input.servings) });
  const nutrient = (row: Nutrient) => numberLine(scaled(row.amount, input.servings), lang);
  return {
    calories: words.amount(numberLine(scaled(input.calories, input.servings), lang), kcalUnit),
    macro,
    nutrient,
    percent: (value: number, total: number) => percentLine(value, total, lang),
  };
}

export function nutritionReading(input: Nutrition, state: StateName, lang?: string): string[] {
  const { nutritionFacts: words } = kitchenWordsFor(lang);
  if (state === "success") return [words.success, words.servingBasis(input.servingLabel)];
  if (state !== "filled") return [];
  const { calories, macro, nutrient, percent } = nutritionDisplay(input, lang);
  const points = nutritionMacros.map(macro);
  const total = points.reduce((sum, point) => sum + point.value, 0);
  const breakdown = points.map(({ label, value }) =>
    words.line(label, words.share(numberLine(value, lang), percent(value, total))),
  );
  return [
    words.line(words.servings, numberLine(input.servings, lang)),
    words.line(words.calories, calories),
    words.servingBasis(input.servingLabel),
    words.macros,
    ...breakdown,
    ...(input.detail === "full" && input.nutrients.length
      ? [
          words.nutrients,
          ...input.nutrients.map((row) => words.line(row.label, words.amount(nutrient(row), row.unit))),
        ]
      : []),
    ...(input.detail === "full" && input.allergens.length
      ? [words.line(words.allergens, words.list(input.allergens))]
      : []),
    words.log,
  ];
}

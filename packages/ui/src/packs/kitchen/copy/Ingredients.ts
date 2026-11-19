import { kitchenItemLine } from "../../../catalog";

export const ingredientsLabels = {
  servings: "Servings",
  less: "One fewer serving",
  more: "One more serving",
  system: "Units",
  metric: "Metric",
  us: "US",
  shop: "Add missing to groceries",
} as const;
export const servingControls = [
  { action: "decrement", icon: "minus", a11y: ingredientsLabels.less, bound: 1 },
  { action: "increment", icon: "plus", a11y: ingredientsLabels.more, bound: 24 },
] as const;

type Unit = "g" | "kg" | "ml" | "l" | "tsp" | "tbsp" | "cup" | "piece" | "pinch" | "none";
type Ingredient = {
  name: string;
  amount?: number | undefined;
  unit: Unit;
  note?: string | undefined;
};
const millilitres = { tsp: 4.92892159375, tbsp: 14.78676478125, cup: 236.5882365 } as const;
const fractions = ["", "¼", "½", "¾"] as const;

/** The controller stores a step delta, not the recipe's seed servings. */
export function servingCount(seed: number, delta: number): number {
  return Math.max(1, Math.min(24, seed + delta));
}

function amountText(value: number): string {
  const quarters = Math.round(value * 4);
  if (Math.abs(value - quarters / 4) < 1e-9) {
    const whole = Math.floor(quarters / 4);
    return `${whole || quarters === 0 ? whole : ""}${fractions[quarters % 4]}`;
  }
  return new Intl.NumberFormat("en-US", { maximumSignificantDigits: 4 }).format(value);
}

/** US volume units are customary, not metric cups; mass never converts to volume. */
export function ingredientAmount(item: Ingredient, scale: number, system: "metric" | "us") {
  let unit: string = item.unit === "none" ? "" : item.unit;
  if (item.amount === undefined) return { amount: "", unit };
  let value = item.amount * scale;
  if (system === "us" && (item.unit === "g" || item.unit === "kg")) {
    unit = item.unit === "kg" ? "lb" : "oz";
    value = (value * (item.unit === "kg" ? 1000 : 1)) / (unit === "lb" ? 453.59237 : 28.349523125);
  } else if (system === "us" && (item.unit === "ml" || item.unit === "l")) {
    unit = "cup";
    value = (value * (item.unit === "l" ? 1000 : 1)) / millilitres.cup;
  } else if (system === "metric" && item.unit in millilitres) {
    unit = "ml";
    value *= millilitres[item.unit as keyof typeof millilitres];
  }
  return { amount: amountText(value), unit };
}

export function ingredientsReading(input: {
  servings: number;
  system: "metric" | "us";
  groups: readonly { label?: string | undefined; items: readonly Ingredient[] }[];
}): string[] {
  let index = 0;
  return [
    `${input.servings} ${ingredientsLabels.servings}`,
    ingredientsLabels.metric,
    ingredientsLabels.us,
    ingredientsLabels.shop,
    ...input.groups.flatMap((group) => [
      ...(group.label ? [group.label] : []),
      ...group.items.map((item) => {
        const quantity = ingredientAmount(item, 1, input.system);
        return kitchenItemLine(
          index++,
          [item.name, quantity.amount, quantity.unit, item.note].filter(Boolean).join(" "),
        );
      }),
    ]),
  ];
}

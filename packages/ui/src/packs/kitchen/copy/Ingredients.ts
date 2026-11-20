import { kitchenItemLine, localeOf, numberLine, pluralForm } from "../../../catalog";
import { kitchenWordsFor } from "../lang";

export const { ingredientsLabels } = kitchenWordsFor();
export const servingControls = [
  { part: "servings_less", action: "decrement", icon: "minus", label: "less", bound: 1 },
  { part: "servings", action: "increment", icon: "plus", label: "more", bound: 24 },
] as const;

type Unit = "g" | "kg" | "ml" | "l" | "tsp" | "tbsp" | "cup" | "piece" | "pinch" | "none";
type Ingredient = {
  name: string;
  amount?: number | undefined;
  unit: Unit;
  note?: string | undefined;
};
const millilitres = { tsp: 4.92892159375, tbsp: 14.78676478125, cup: 236.5882365 } as const;

function amountText(value: number, lang?: string): string {
  const quarters = Math.round(value * 4);
  if (Math.abs(value - quarters / 4) < 1e-9) {
    const whole = Math.floor(quarters / 4);
    return `${whole || quarters === 0 ? numberLine(whole, lang) : ""}${kitchenWordsFor(lang).ingredientFractions[quarters % 4]}`;
  }
  return new Intl.NumberFormat(localeOf(lang), { maximumSignificantDigits: 4 }).format(value);
}

/** US volume units are customary, not metric cups; mass never converts to volume. */
export function ingredientAmount(item: Ingredient, scale: number, system: "metric" | "us", lang?: string) {
  const words = kitchenWordsFor(lang);
  let unit: keyof typeof words.ingredientUnits = item.unit;
  if (item.amount === undefined) return { amount: "", unit: words.ingredientUnits[unit] };
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
  return {
    amount: amountText(value, lang),
    unit:
      unit === "piece" ? words.ingredientPieces(value, pluralForm(value, lang)) : words.ingredientUnits[unit],
  };
}

export function ingredientsReading(
  input: {
    servings: number;
    servingsShown?: number;
    detail?: "full" | "brief";
    system: "metric" | "us";
    groups: readonly { label?: string | undefined; items: readonly Ingredient[] }[];
  },
  lang?: string,
): string[] {
  const { ingredientsLabels, ingredientServings } = kitchenWordsFor(lang);
  const shown = input.servingsShown ?? input.servings;
  let index = 0;
  return [
    ingredientServings(numberLine(shown, lang), ingredientsLabels.servings),
    ingredientsLabels.metric,
    ingredientsLabels.us,
    ingredientsLabels.shop,
    ...input.groups.flatMap((group) => [
      ...(group.label ? [group.label] : []),
      ...group.items.map((item) => {
        const quantity = ingredientAmount(item, shown / input.servings, input.system, lang);
        return kitchenItemLine(
          index++,
          [item.name, quantity.amount, quantity.unit, input.detail !== "brief" && item.note]
            .filter(Boolean)
            .join(" "),
        );
      }),
    ]),
  ];
}

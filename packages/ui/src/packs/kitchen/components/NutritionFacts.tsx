import { z } from "zod";
import * as c from "../../../catalog";

// Core first: KeyValue/arrange:rows displays static facts, not serving-scaled amounts or macro shares.
export const meta = {
  id: "NutritionFacts",
  status: "draft",
  group: "data",
  purpose: "See how calories, macros and nutrients change with the portion of one food.",
  pick: "Nutrition for one food or recipe, with a serving multiplier and macro breakdown. Not flat facts (KeyValue), progress against a daily target (Progress), or a day's meals (FoodLog).",
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "Calculate from recipe data on the device, or look up the food in an external barcode database.",
  variants: {
    density: ["comfortable", "compact"],
    surface: ["card", "outlined"],
    detail: ["full", "brief"],
  },
  variantParts: { "detail.brief": { hides: ["root", "label", "amount", "allergens"] } },
  items: {
    key: "rows",
    parts: ["root", "label", "amount"],
    variants: { tone: ["neutral", "good", "warn", "bad"] },
  },
  parts: ["root", "title", "serving_label", "servings", "calories", "macros", "allergens", "log", "success"],
  states: ["filled", "empty", "loading", "success"],
  actions: { parts: { servings: ["increment", "decrement"], log: ["press"] } },
  adjust: {
    "servings.increment": { prop: "servings", delta: 0.25, min: 0.25, max: 12 },
    "servings.decrement": { prop: "servings", delta: -0.25, min: 0.25, max: 12 },
  },
} as const satisfies c.Meta;

const nutrient = z.strictObject({
  label: c.text(20),
  amount: z.number().nonnegative(),
  unit: c.text(8),
  ...c.itemVariantProps(meta.items.variants),
});

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  title: c.text(32),
  servingLabel: c.text(24),
  servings: z.number().min(0.25).max(12).default(1),
  calories: z.number().nonnegative(),
  protein: z.number().nonnegative(),
  carbs: z.number().nonnegative(),
  fat: z.number().nonnegative(),
  nutrients: z.array(nutrient).min(0).max(8),
  allergens: z.array(c.text(16)).min(0).max(6),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const item = c.itemsOf(cast, 1)[0],
    thing = c.thingOf(cast);
  return {
    title: c.titleOf(item, 32, thing) ?? c.placeholderTitle(0, lang),
    servingLabel: c.detailOf(item, 24, thing) ?? c.placeholderLabel(lang),
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    nutrients: [],
    allergens: [],
  };
}

const bowl = {
  title: "Lemon chickpea bowl",
  servingLabel: "1 bowl",
  servings: 1.5,
  calories: 420,
  protein: 18,
  carbs: 52,
  fat: 16,
  nutrients: [
    { label: "Fiber", amount: 9, unit: "g", tone: "good" },
    { label: "Sugar", amount: 5, unit: "g" },
    { label: "Sodium", amount: 460, unit: "mg", tone: "warn" },
  ],
  allergens: ["Sesame", "Milk"],
} satisfies z.input<typeof props>;
export const examples = [
  bowl,
  {
    title: "Peanut butter toast",
    servingLabel: "1 slice",
    calories: 260,
    protein: 10,
    carbs: 28,
    fat: 12,
    nutrients: [{ label: "Fiber", amount: 4, unit: "g" }],
    allergens: ["Peanuts", "Wheat"],
  },
  { ...bowl, detail: "brief" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("NutritionFacts");
export const probes = [
  choose(
    "Let me change the number of servings of this one recipe and see its calories, protein, carbs and fat update.",
  ),
  choose(
    "Show the jar's static facts: origin Italy, net weight 300 g, and storage in the refrigerator.",
    "KeyValue",
  ),
  write(
    "Lemon chickpea bowl: one bowl per serving, 420 calories, 18 g protein, 52 g carbs, 16 g fat, 9 g fiber, and contains sesame. Start with 1.5 servings.",
  ),
  {
    ...write(
      "For one bowl of soup with 200 calories, 10 g protein, 25 g carbs, 7 g fat, 5 g fiber and milk, show the serving control, calories and macros. Keep the fiber and milk in the data, but hide nutrient details and allergens.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Increase the portion size.", { address: "n1/servings", action: "increment" }),
  read("Decrease the portion size.", { address: "n1/servings", action: "decrement" }),
  read("Log this portion in my food diary.", { address: "n1/log", action: "press" }),
] satisfies c.Probe[];

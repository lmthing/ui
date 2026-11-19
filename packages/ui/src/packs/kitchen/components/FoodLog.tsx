import { z } from "zod";
import {
  itemsOf,
  kitchenItemLine,
  placeholderTitle,
  probesFor,
  screenId,
  text,
  thingOf,
  titleOf,
  totalLine,
  type CastLike,
  type Meta,
  type Probe,
} from "../../../catalog";

// Core first: List/inset cannot group eaten foods by meal with numeric calories and per-meal add actions.
export const meta = {
  id: "FoodLog",
  status: "draft",
  group: "input",
  purpose: "Record foods eaten by meal and see their calories against a daily target.",
  pick: "Today's eaten foods grouped by meal with calories and an add action per meal. Not a plain list (List), plans for the week (MealPlan), or calorie goals alone (Progress).",
  writeHints: [
    "Write calories per food, never meal or day totals. Each meal occurs once. goto is the add-food screen; a database lookup there needs a service.",
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  partTiers: { add: "service" },
  realPath: "Food entries stored on the device; database lookup for adding food requires a service.",
  items: { key: "rows", parts: ["root", "meal", "name", "kcal", "amount", "add"] },
  parts: ["root", "target", "total"],
  states: ["filled", "empty"],
  actions: {
    items: { add: ["press"], root: ["press"] },
    when: { add: { entry: "meal" }, root: { entry: "food" } },
  },
  read: (input) => {
    const value = input as z.output<typeof props>;
    let index = 0;
    return [
      totalLine(value.meals.flatMap((meal) => meal.items).reduce((sum, item) => sum + item.kcal, 0)),
      ...(value.target === undefined ? [] : [String(value.target)]),
      ...value.meals.flatMap((meal) => [
        kitchenItemLine(index++, meal.meal),
        ...meal.items.map((item) =>
          kitchenItemLine(index++, `${item.name} ${item.kcal}${item.amount ? ` · ${item.amount}` : ""}`),
        ),
      ]),
    ];
  },
} as const satisfies Meta;
export const props = z
  .strictObject({
    meals: z
      .array(
        z.strictObject({
          meal: z.enum(["breakfast", "lunch", "dinner", "snack"]).meta({ kind: "text" }),
          items: z
            .array(
              z.strictObject({
                name: text(28),
                kcal: z.number().min(0).max(10000),
                amount: text(12).optional(),
              }),
            )
            .min(0)
            .max(6),
        }),
      )
      .min(1)
      .max(4),
    target: z.number().min(1).max(20000).optional(),
    goto: screenId,
  })
  .refine((value) => new Set(value.meals.map((meal) => meal.meal)).size === value.meals.length, {
    path: ["meals"],
    message: "Each meal appears once",
  })
  .overwrite((value) => ({
    ...value,
    rows: value.meals.flatMap((meal) => [
      { entry: "meal" as const, meal: meal.meal, goto: value.goto },
      ...meal.items.map((item) => ({ entry: "food" as const, ...item })),
    ]),
  }));
export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const thing = thingOf(cast);
  const items = itemsOf(cast, 3).map((item, index) => ({
    name: titleOf(item, 28, thing) ?? placeholderTitle(index),
    kcal: 0,
  }));
  return { meals: [{ meal: "dinner", items }], goto: "details" };
}
export const examples = [
  {
    meals: [
      { meal: "dinner", items: [{ name: "Lasagne", kcal: 520, amount: "1 slice" }] },
      { meal: "snack", items: [] },
    ],
    target: 2000,
    goto: "food_add",
  },
  {
    meals: [
      {
        meal: "breakfast",
        items: [
          { name: "Apple porridge", kcal: 310, amount: "1 bowl" },
          { name: "Milk", kcal: 90 },
        ],
      },
      { meal: "lunch", items: [] },
    ],
    goto: "food_add",
  },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("FoodLog");
export const probes = [
  choose("Log what I ate today grouped by meal, with food calories and an add button for each meal"),
  choose(
    "Browse a few ordinary records with short details and links, without meal groups or calorie totals",
    "List",
  ),
  write(
    "Dinner contains one slice of lasagne at 520 kcal, snack is empty, the daily target is 2000 and adding food opens food_add",
  ),
  read("Add another food to dinner", { address: "f1/r1/add", action: "press" }),
  read("Open the logged lasagne entry", { address: "f1/r2", action: "press" }),
] satisfies Probe[];

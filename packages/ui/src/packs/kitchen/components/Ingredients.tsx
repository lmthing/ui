import { z } from "zod";
import {
  detailOf,
  itemsOf,
  placeholderTitle,
  probesFor,
  text,
  thingOf,
  titleOf,
  type CastLike,
  type Meta,
  type Probe,
} from "../../../catalog";

// Core first: Checklist/default cannot scale numeric ingredient amounts by servings or switch units.
export const meta = {
  id: "Ingredients",
  status: "draft",
  group: "input",
  purpose: "Scale a recipe's grouped ingredient amounts and tick what you have while cooking.",
  pick: "Recipe ingredient amounts with a servings stepper and metric or US switch. Not general tasks (Checklist), food to buy (GroceryList), or stored food (Pantry).",
  writeHints: [
    "Amounts are the seed quantities for the written servings. Never write scaled amounts, conversions, item ids or check states.",
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "Recipe data stored on the device.",
  items: { key: "rows", parts: ["root", "name", "amount", "unit", "note", "have"] },
  parts: ["root", "servings", "system", "shop"],
  states: ["filled"],
  actions: {
    parts: { servings: ["increment", "decrement"], system: ["select"], shop: ["press"] },
    items: { have: ["check"] },
  },
  read: (input) => {
    const value = input as z.output<typeof props>;
    return [
      String(value.servings),
      value.system,
      ...value.groups.flatMap((group) => [
        ...(group.label ? [group.label] : []),
        ...group.items.map(
          (item) =>
            `${item.name}${item.amount === undefined ? "" : ` ${item.amount} ${item.unit}`}${item.note ? ` · ${item.note}` : ""}`,
        ),
      ]),
    ];
  },
} as const satisfies Meta;

export const props = z
  .strictObject({
    servings: z.int().min(1).max(24),
    groups: z
      .array(
        z.strictObject({
          label: text(20).optional(),
          items: z
            .array(
              z.strictObject({
                name: text(28),
                amount: z.number().min(0).max(100000).optional(),
                unit: z
                  .enum(["g", "kg", "ml", "l", "tsp", "tbsp", "cup", "piece", "pinch", "none"])
                  .default("none"),
                note: text(20).optional(),
              }),
            )
            .min(1)
            .max(16),
        }),
      )
      .min(1)
      .max(3),
    system: z.enum(["metric", "us"]).default("metric"),
  })
  .overwrite((value) => ({
    ...value,
    rows: value.groups.flatMap((group) => group.items.map((item) => ({ ...item, have: false }))),
  }));

export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const thing = thingOf(cast);
  const items = itemsOf(cast, 3).map((item, index) => ({
    name: titleOf(item, 28, thing) ?? placeholderTitle(index),
    note: detailOf(item, 20, thing),
    unit: "none" as const,
  }));
  return {
    servings: 1,
    groups: [{ items: items.length ? items : [{ name: placeholderTitle(0), unit: "none" }] }],
  };
}
export const examples = [
  // Ledge: the plant keeper's household supper.
  {
    servings: 4,
    groups: [
      { label: "Sauce", items: [{ name: "Tomatoes", amount: 600, unit: "g", note: "Chopped" }] },
      { label: "Layers", items: [{ name: "Lasagne sheets", amount: 8, unit: "piece" }] },
    ],
    system: "metric",
  },
  // Trot: breakfast before the walking round.
  {
    servings: 2,
    groups: [
      {
        items: [
          { name: "Oats", amount: 1, unit: "cup" },
          { name: "Milk", amount: 0.5, unit: "cup" },
          { name: "Cinnamon", unit: "pinch" },
        ],
      },
    ],
    system: "us",
  },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("Ingredients");
export const probes = [
  choose("Scale the grouped ingredients in my recipe from four servings to six and tick what I have"),
  choose("Tick off three household jobs, without quantities or serving controls", "Checklist"),
  write(
    "A four-serving lasagne with sauce: 600 g tomatoes, and layers: eight lasagne sheets; use metric units",
  ),
  read("Increase the recipe servings by one", { address: "i1/servings", action: "increment" }),
  read("Tick that I have the tomatoes", { address: "i1/r1/have", action: "check" }),
] satisfies Probe[];

import { z } from "zod";
import {
  itemsOf,
  placeholderDetail,
  placeholderTitle,
  probesFor,
  text,
  thingOf,
  titleOf,
  type CastLike,
  type Meta,
  type Probe,
} from "../../../catalog";

// Core first: Checklist/inset cannot group groceries by aisle with quantities and shared authors.
export const meta = {
  id: "GroceryList",
  status: "draft",
  group: "input",
  purpose: "Buy groceries by aisle and tick off what is in the bag.",
  pick: "Shopping for food grouped by aisle, with quantities and optional people who added it. Not general jobs (Checklist), recipe amounts (Ingredients), or an online basket (Cart).",
  writeHints: [
    "Each aisle has 1–12 items; use 1–8 aisles. got is a stored check state. Do not write totals or computed sorting.",
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  partTiers: { by: "people" },
  realPath: "A list stored on the device; authors and others' additions require a shared household app.",
  items: { key: "rows", parts: ["root", "name", "qty", "got", "by"] },
  parts: ["root", "add"],
  states: ["filled", "empty", "success"],
  signature: "check_burst",
  actions: { items: { got: ["check"] }, parts: { add: ["type"] } },
  read: (input) => {
    const value = input as z.output<typeof props>;
    return value.aisles.flatMap((aisle) => [
      aisle.label,
      ...aisle.items.map(
        (item) => `${item.name}${item.qty ? ` · ${item.qty}` : ""}${item.by ? ` · ${item.by}` : ""}`,
      ),
    ]);
  },
} as const satisfies Meta;
export const props = z
  .strictObject({
    aisles: z
      .array(
        z.strictObject({
          label: text(16),
          items: z
            .array(
              z.strictObject({
                name: text(28),
                qty: text(12).optional(),
                got: z.boolean().default(false),
                by: text(12).optional(),
              }),
            )
            .min(1)
            .max(12),
        }),
      )
      .min(1)
      .max(8),
  })
  .overwrite((value) => ({ ...value, rows: value.aisles.flatMap((aisle) => aisle.items) }));
export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const thing = thingOf(cast);
  const items = itemsOf(cast, 3).map((item, index) => ({
    name: titleOf(item, 28, thing) ?? placeholderTitle(index),
    got: false,
  }));
  return {
    aisles: [
      { label: placeholderDetail, items: items.length ? items : [{ name: placeholderTitle(0), got: false }] },
    ],
  };
}
export const examples = [
  {
    aisles: [
      { label: "Produce", items: [{ name: "Tomatoes", qty: "600 g", got: false, by: "Sam" }] },
      { label: "Dairy", items: [{ name: "Ricotta", qty: "250 g", got: true }] },
    ],
  },
  {
    aisles: [
      {
        label: "Breakfast",
        items: [
          { name: "Oats", qty: "1 bag", got: false },
          { name: "Milk", qty: "1 l", got: false, by: "Alex" },
        ],
      },
    ],
  },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("GroceryList");
export const probes = [
  choose("Tick groceries off in the shop, grouped by aisle, with quantities and who added each"),
  choose("Tick off household jobs without quantities, aisles or people who added them", "Checklist"),
  write(
    "A grocery list: Produce has 600 g tomatoes not yet bought, added by Sam. Dairy has 250 g ricotta already bought",
  ),
  read("Mark tomatoes as bought", { address: "g1/r1/got", action: "check" }),
  read("Add another grocery item", { address: "g1/add", action: "type" }),
] satisfies Probe[];

import { z } from "zod";
import * as c from "../../../catalog";

// Core first: List/cards cannot adjust owned quantities or flag stock at its minimum.
export const meta = {
  id: "Things",
  status: "draft",
  group: "content",
  purpose: "See what you own, where it is kept and what needs restocking.",
  pick: "Owned or stocked items with editable quantities, storage locations or a per-item low-stock minimum. Not a plain directory of names (List), goods for sale (ProductGrid), food at home (Pantry), or a media library (Library).",
  writeHints: [
    "qty and min are nonnegative whole counts. Low stock means qty is at or below min; never write a low-stock flag. Keep all records when filter is low.",
    'Use arrange "rows" only for a row layout; the default is a photo grid. Leave density null unless asked for different spacing.',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "Stock and ownership records live on the device.",
  variants: { arrange: ["grid", "rows"], density: ["comfortable", "compact"] },
  parts: ["root"],
  items: {
    key: "items",
    parts: ["root", "name", "photo", "qty", "where", "value", "low"],
    adjust: {
      "qty.increment": { prop: "qty", delta: 1, min: 0 },
      "qty.decrement": { prop: "qty", delta: -1, min: 0 },
    },
    visibleWhen: { visible: true },
  },
  states: ["filled", "empty", "loading"],
  actions: { items: { root: ["press"], qty: ["increment", "decrement"] } },
  read: (input, _state, lang): string[] =>
    (input as z.output<typeof props>).items.map(({ name, qty, min }) =>
      [JSON.stringify(name), c.numberLine(qty, lang), min === undefined ? undefined : c.numberLine(min, lang)]
        .filter((value) => value !== undefined)
        .join(" · "),
    ),
} as const satisfies c.Meta;

const item = z.strictObject({
  name: c.text(28),
  photo: c.photo.optional(),
  qty: z.int().nonnegative(),
  min: z.int().nonnegative().optional(),
  where: c.text(24).optional(),
  value: z.number().nonnegative().optional(),
  goto: c.screenId,
});
export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    items: z.array(item).min(1).max(12),
    filter: z.enum(["all", "low"]).default("all"),
  })
  .overwrite((value) => ({
    ...value,
    items: value.items.map((row) => ({
      ...row,
      visible: value.filter === "all" || (row.min !== undefined && row.qty <= row.min),
    })),
  }));

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const items = c.itemsOf(cast, 3).map((row, i) => ({
    name: c.titleOf(row, 28, thing) ?? c.placeholderTitle(i, lang),
    where: c.detailOf(row, 24, thing),
    qty: 0,
    goto: "details",
  }));
  return {
    items: items.length ? items : [{ name: c.placeholderTitle(0, lang), qty: 0, min: 0, goto: "details" }],
  };
}

export const examples = [
  {
    items: [
      {
        name: "Terracotta pot",
        photo: "lib:plants",
        qty: 2,
        min: 2,
        where: "Potting shelf",
        value: 8,
        goto: "pots",
      },
    ],
  },
  {
    arrange: "rows",
    density: "compact",
    filter: "low",
    items: [
      { name: "Spare lead", qty: 4, min: 1, goto: "leads" },
      { name: "Waste bag roll", qty: 1, min: 2, where: "Van bin", goto: "bags" },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Things");
export const probes = [
  choose(
    "Track the gear I own with quantities I can adjust, storage bins and a minimum on each item that flags low stock",
  ),
  choose(
    "Show a tappable directory of three people by name, each linked to their profile. No stock or quantities.",
    "List",
  ),
  write(
    "Track two terracotta pots on the Potting shelf. Flag at two remaining, value 8, photo lib:plants, details at pots.",
  ),
  {
    ...write(
      "Show my owned stock one row per item, not as photo tiles: one spare lead in Van bin, at minimum two, details at leads.",
    ),
    variant: { axis: "arrange", value: "rows" },
  },
  read("I found one more terracotta pot. Increase its quantity by one.", {
    address: "t1/r1/qty",
    action: "increment",
  }),
] satisfies c.Probe[];

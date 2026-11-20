import { z } from "zod";
import * as c from "../../../catalog";

// Core first: List/rows lists products, not editable quantities, line prices, promo input and computed totals.
export const meta = {
  id: "Cart",
  status: "draft",
  group: "content",
  purpose: "Review and edit what you are about to buy.",
  pick: "A shopping basket before ordering, with editable quantities, removal, a promo code and computed totals. Not simple rows (List), an already placed order (OrderSummary), or a grocery checklist (GroceryList).",
  writeHints: [
    "Write each line's unit price and quantity. The optional delivery charge is separate; do not write subtotals, line totals or a grand total.",
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "The basket is kept on the device.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "plain"] },
  parts: ["root", "promo", "subtotal", "delivery", "total"],
  items: {
    key: "lines",
    parts: ["root", "name", "variant", "photo", "qty", "price", "remove"],
    adjust: {
      "qty.increment": { prop: "qty", delta: 1, min: 1, max: 99 },
      "qty.decrement": { prop: "qty", delta: -1, min: 1, max: 99 },
    },
  },
  confirmParts: ["remove"],
  states: ["filled", "empty", "loading"],
  actions: { parts: { promo: ["type"] }, items: { qty: ["increment", "decrement"], remove: ["press"] } },
  read: (input, state, lang): string[] => {
    if (state !== "filled") return [];
    const { lines, delivery } = input as { lines: z.output<typeof lineProps>[]; delivery?: number };
    const { total } = c.documentTotals({
      lines: delivery === undefined ? lines : [...lines, { qty: 1, price: delivery }],
    });
    return [
      c.totalLine(total, undefined, lang),
      ...lines.map(({ name, qty }) => `${name}: ${c.numberLine(qty, lang)}`),
    ];
  },
} as const satisfies c.Meta;

const lineProps = z.strictObject({
  name: c.text(28),
  variant: c.text(20).optional(),
  photo: c.photo,
  qty: z.int().min(1).max(99),
  price: z.number().min(0),
});
export const props = z.strictObject({
  lines: z.array(lineProps).min(1).max(8),
  delivery: z.number().min(0).optional(),
  ...c.variantProps(meta.variants),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const names = c
    .itemsOf(cast, 3)
    .map((item) => c.titleOf(item, 28, thing))
    .filter((name) => name !== undefined);
  return {
    lines: (names.length ? names : [c.placeholderTitle(0, lang)]).map((name) => ({
      name,
      photo: "local:1",
      qty: 1,
      price: Number(c.placeholderValue),
    })),
  };
}

export const examples = [
  {
    delivery: 3,
    lines: [
      { name: "Fern pot", variant: "Olive", photo: "lib:fern", qty: 2, price: 12 },
      { name: "Basil planter", photo: "lib:basil", qty: 1, price: 10 },
    ],
  },
  {
    density: "compact",
    surface: "plain",
    lines: [{ name: "Reflective lead", photo: "local:1", qty: 1, price: 18 }],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Cart");
export const probes = [
  choose(
    "Review my basket before buying, with plus and minus on every item, a discount code box and a subtotal and total",
  ),
  choose(
    "Show tappable rows for past purchases with an order number and status badge on each, no basket or quantity changes",
    "List",
  ),
  write(
    "A basket with two Olive fern pots at 12 each and one basil planter at 10, photos lib:fern and lib:basil, plus 3 delivery.",
  ),
  read("Remove the basil planter from the basket", { address: "c1/r2/remove", action: "press" }),
] satisfies c.Probe[];

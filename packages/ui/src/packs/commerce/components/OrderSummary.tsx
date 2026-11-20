import { z } from "zod";
import * as c from "../../../catalog";

// Core first: KeyValue/rows shows fixed facts, not receipt quantities, computed totals and reorder.
export const meta = {
  id: "OrderSummary",
  status: "draft",
  group: "content",
  purpose: "See what was ordered, what it cost and how it will arrive.",
  pick: "A receipt for one placed goods order with quantities and fulfillment details. Not simple facts (KeyValue), the editable basket (Cart), fulfillment progress (OrderStatus), or a client bill (Invoice).",
  writeHints: [
    "Write unit prices and quantities only; the total is computed. Use a real placed date in YYYY-MM-DD.",
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "A placed order is an order record on the device.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "plain"] },
  parts: ["root", "number", "date", "mode", "place", "total", "reorder"],
  items: { key: "lines", parts: ["root", "name", "qty", "price"] },
  states: ["filled", "loading"],
  actions: { parts: { reorder: ["press"] } },
  read: (input, state, lang): string[] => {
    if (state !== "filled") return [];
    const { lines, mode } = input as { lines: z.output<typeof lineProps>[]; mode: string };
    return [
      mode,
      c.totalLine(c.documentTotals({ lines }).total, undefined, lang),
      ...lines.map(({ name, qty, price }) =>
        c.documentFieldLine(
          name,
          `${c.quantityLine(qty, lang)} · ${c.moneyLine(price, undefined, "each", lang)}`,
          lang,
        ),
      ),
    ];
  },
} as const satisfies c.Meta;

const lineProps = z.strictObject({
  name: c.text(28),
  qty: z.int().min(1).max(99),
  price: z.number().min(0).multipleOf(0.01),
});
export const props = z.strictObject({
  number: c.text(12),
  date: c.isoDate,
  lines: z.array(lineProps).min(1).max(8),
  mode: z.enum(["pickup", "delivery", "table"]),
  place: c.text(60).optional(),
  ...c.variantProps(meta.variants),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const names = c
    .itemsOf(cast, 3)
    .map((item) => c.titleOf(item, 28, thing))
    .filter((name) => name !== undefined);
  return {
    number: c.placeholderValue,
    date: "1970-01-01",
    lines: (names.length ? names : [c.placeholderTitle(0, lang)]).map((name) => ({
      name,
      qty: 1,
      price: Number(c.placeholderValue),
    })),
    mode: "pickup",
  };
}

export const examples = [
  {
    number: "PL-104",
    date: "2026-11-20",
    lines: [{ name: "Fern pot", qty: 2, price: 12 }],
    mode: "pickup",
    place: "Glasshouse counter",
  },
  {
    number: "TR-125",
    date: "2026-11-21",
    lines: [{ name: "Reflective lead", qty: 1, price: 18 }],
    mode: "delivery",
    density: "compact",
    surface: "plain",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("OrderSummary");
export const probes = [
  choose(
    "Show a receipt for one completed purchase with the order number, date, items and quantities, and where to collect it",
  ),
  choose(
    "Show simple labelled facts about a fern: species, room and watering frequency, with no items or totals",
    "KeyValue",
  ),
  write(
    "Write the receipt for placed order PL-104 on 2026-11-20: two fern pots at 12 each, pickup at the Glasshouse counter.",
  ),
  read("Buy what I bought in order PL-104 again", { address: "o1/reorder", action: "press" }),
] satisfies c.Probe[];

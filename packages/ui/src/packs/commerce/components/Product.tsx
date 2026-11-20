import { z } from "zod";
import * as c from "../../../catalog";

// Core first: Amount/was shows a sale price, not the product, stock, save and quantity-to-add controls together.
export const meta = {
  id: "Product",
  status: "draft",
  group: "content",
  purpose: "Decide whether to buy one product and add the desired quantity.",
  pick: "One product for sale with a description, stock, saving or quantity and add controls. Not a price alone (Amount), several products (ProductGrid), or a timed service (ServiceMenu).",
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Product records and saved products live on the device.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "plain"] },
  parts: ["root", "name", "price", "was", "description", "stock", "badge", "qty", "add", "save"],
  states: ["filled", "loading", "success"],
  actions: { parts: { qty: ["increment", "decrement"], add: ["press"], save: ["toggle"] } },
  read: (input, state, lang): string[] => {
    if (state !== "filled") return [];
    const { price, was, stock } = input as { price: number; was?: number; stock?: number };
    const current = c.moneyLine(price, undefined, undefined, lang);
    return [
      was === undefined ? current : `${c.moneyLine(was, undefined, undefined, lang)} → ${current}`,
      ...(stock === undefined ? [] : [c.quantityLine(stock, lang)]),
    ];
  },
} as const satisfies c.Meta;

export const props = z.strictObject({
  name: c.text(32),
  price: z.number().min(0).multipleOf(0.01),
  was: z.number().min(0).multipleOf(0.01).optional(),
  description: c.text(240),
  stock: z.int().min(0).optional(),
  badge: c.text(12).optional(),
  saved: z.boolean(),
  ...c.variantProps(meta.variants),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const item = c.itemsOf(cast, 1)[0];
  return {
    name: (item && c.titleOf(item, 32, thing)) || c.placeholderTitle(0, lang),
    price: Number(c.placeholderValue),
    description: (item && c.detailOf(item, 240, thing)) || c.placeholderDetail,
    saved: false,
  };
}

export const examples = [
  {
    name: "Ceramic fern pot",
    price: 12,
    was: 16,
    description: "A glazed pot with a matching drip tray.",
    stock: 3,
    badge: "Sale",
    saved: false,
  },
  {
    name: "Reflective lead",
    price: 18,
    description: "A soft-grip lead for early walks.",
    saved: true,
    density: "compact",
    surface: "plain",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Product");
export const probes = [
  choose(
    "Show the detail page for one ceramic pot with its description, price, stock, save heart and a quantity control beside Add to basket",
  ),
  choose(
    "Show only the current price with the old price struck through, no product details or actions",
    "Amount",
  ),
  write(
    "Write the detail panel for a ceramic fern pot with a matching drip tray, now 12 down from 16, three left, tagged Sale and not saved",
  ),
  read("Save the ceramic fern pot for later", { address: "p1/save", action: "toggle" }),
] satisfies c.Probe[];

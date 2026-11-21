import { z } from "zod";
import * as c from "../../../catalog";

const maxPrice = 99999.99;
const price = z.number().min(0).max(maxPrice).multipleOf(0.01);

// Core first: List/trail badge can open a saved link, but cannot compare shop prices, set alerts or move goods into a basket.
// prettier-ignore
export const meta = {
  id: "SavedList", status: "draft", group: "content",
  purpose: "Track saved shop products, compare prices, and move items to the basket.",
  pick: "A shop wishlist for saved buy-later products with saved versus current prices, drop alerts, a move-to-cart action, or shared gift claims. Not already in the basket (Cart), ordinary saved links (List), owned stock (Things), or an event registry (Registry).",
  writeHints: [
    "Use a distinct short product id per item, including items without a link. Use numeric prices without a currency sign. Only write stock when known and never write computed badges.",
    'Set shared true only for a shared gift list. For two columns set arrange "grid"; use null for unrequested density and surface, never explicit defaults.',
  ],
  region: "body", weight: 3, dense: true, tier: "phone",
  partTiers: { claim: "people" },
  confirmParts: ["remove"],
  realPath: "Saved products and target prices stay on device; gift claims need a shared app and price alerts need notifications or a watch service.",
  variants: { arrange: ["rows", "grid"], density: ["comfortable", "compact"], surface: ["card", "plain"] },
  parts: ["root", "empty", "status"],
  items: {
    key: "items",
    parts: ["root", "tile", "name", "photo", "price", "saved_price", "badge", "alert", "claim", "claim_label", "move", "move_label", "remove", "remove_icon"],
  },
  states: ["filled", "empty", "loading", "success", "error"],
  actions: {
    items: { root: ["press"], move: ["press"], alert: ["set"], claim: ["toggle"], remove: ["press"] },
    when: { root: { linked: true }, move: { available: true }, claim: { shared: true } },
    noGoto: { items: ["move", "remove"] },
  },
  successActions: ["root.press", "move.press", "alert.set", "claim.toggle", "remove.press"],
  readSuccess: true,
} as const satisfies c.Meta;

// prettier-ignore
const item = z.strictObject({
  id: c.text(24).meta({ kind: undefined }), name: c.text(28), photo: c.photo.optional(),
  price, savedPrice: price.optional(), targetPrice: price.optional(),
  stock: z.int().min(0).optional(), claimed: z.boolean().default(false), goto: c.screenId.optional(),
});

export const props = z
  .strictObject({
    items: z.array(item).min(1).max(12),
    shared: z.boolean().default(false),
    ...c.variantProps(meta.variants),
  })
  .refine(({ items }) => new Set(items.map(({ id }) => id)).size === items.length, { path: ["items"] })
  .overwrite(({ items, ...input }) => ({
    ...input,
    items: items.map((row) => ({
      ...row,
      productRef: row.id,
      linked: Boolean(row.goto),
      available: row.stock !== 0,
    })),
  }));

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const names = c.itemsOf(cast, 3).flatMap((record) => c.titleOf(record, 28, thing) ?? []);
  return {
    items: (names.length ? names : [c.placeholderTitle(0, lang)]).map((name, i) => ({
      id: `item_${i + 1}`,
      name,
      price: Number(c.wordsFor(lang).placeholderValue),
    })),
  };
}

// prettier-ignore
export const examples = [
  { items: [
    { id: "fern_pot", name: "Glazed fern pot", photo: "lib:fern", price: 12, savedPrice: 16,
      targetPrice: 11, stock: 8, goto: "fern" },
    { id: "basil_planter", name: "Basil planter", photo: "lib:basil", price: 10, savedPrice: 10, stock: 2 },
  ] },
  { arrange: "grid", shared: true, items: [
    { id: "walk_lead", name: "Reflective lead", photo: "lib:dog", price: 18, targetPrice: 15, claimed: true, goto: "lead" },
    { id: "treat_pouch", name: "Treat pouch", price: 14, savedPrice: 16, stock: 0 },
  ] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("SavedList");
// prettier-ignore
export const probes = [
  choose("Keep shop products I want to buy later, compare the prices I saved them at, set a price alert, and move a saved item into my basket."),
  choose("Show ordinary saved links to the fern and basil care pages as short rows with a badge. No prices or buying.", "List"),
  write("I saved fern_pot, Glazed fern pot, at 16. It now costs 12, there are 8 left, and I want an alert at 11. Link it to fern."),
  {
    ...write("Display two columns of saved shop products: walk_lead Reflective lead is 18 and treat_pouch Treat pouch is 14. I had saved them at 20 and 16 respectively."),
    variant: { axis: "arrange", value: "grid", itemTitles: ["Reflective lead", "Treat pouch"] },
  },
  read("Open the product page for the glazed fern pot", { address: "s1/r1", action: "press" }),
  read("Move the glazed fern pot into my basket without opening its product page", { address: "s1/r1/move", action: "press" }),
  read("Set the glazed fern pot's price alert to 10", { address: "s1/r1/alert", action: "set" }),
  read("Mark the treat pouch as claimed on the shared gift list", { address: "s1/r2/claim", action: "toggle" }, 1),
  read("Start removing the basil planter from saved items", { address: "s1/r2/remove", action: "press" }),
] satisfies c.Probe[];

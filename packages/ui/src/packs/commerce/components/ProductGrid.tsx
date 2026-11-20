import { z } from "zod";
import * as c from "../../../catalog";

// Core first: Gallery/grid shows photos, not prices, sale badges and a quick add per item.
export const meta = {
  id: "ProductGrid",
  status: "draft",
  group: "content",
  purpose: "Browse products with prices and quickly add the ones you want.",
  pick: "Browse several priced goods with a quick add per product, as photo cards or food menu rows. Not photos without prices (Gallery), timed services (ServiceMenu), or owned things (Things).",
  writeHints: [
    'Use arrange "grid" for two-column product cards. Use "rows" for menu rows with a right-hand photo and optional sub line; omit sub for grid.',
    "Leave density null when only the arrangement is requested; menu rows do not imply a change of spacing.",
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "A product query runs on the device.",
  variants: { density: ["comfortable", "compact"], arrange: ["grid", "rows"] },
  variantParts: { "arrange.rows": { adds: ["sub"] } },
  parts: ["root"],
  items: { key: "items", parts: ["root", "name", "price", "was", "photo", "badge", "sub", "add"] },
  states: ["filled", "empty", "loading"],
  actions: { items: { root: ["press"], add: ["press"] } },
} as const satisfies c.Meta;

const itemProps = z.strictObject({
  name: c.text(28),
  price: z.number().min(0),
  was: z.number().min(0).optional(),
  photo: c.photo,
  badge: c.text(12).optional(),
  sub: c.text(48).optional(),
  goto: c.screenId,
});
export const props = z
  .strictObject({
    items: z.array(itemProps).min(1).max(8),
    ...c.variantProps(meta.variants),
  })
  .refine(({ arrange, items }) => arrange === "rows" || items.every(({ sub }) => sub === undefined), {
    path: ["items"],
  });

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const names = c
    .itemsOf(cast, 3)
    .map((item) => c.titleOf(item, 28, thing))
    .filter((name) => name !== undefined);
  return {
    items: (names.length ? names : [c.placeholderTitle(0, lang)]).map((name) => ({
      name,
      price: Number(c.placeholderValue),
      photo: "local:1",
      goto: "detail",
    })),
  };
}

export const examples = [
  {
    items: [
      { name: "Fern pot", price: 12, was: 16, photo: "lib:fern", badge: "Sale", goto: "fern_pot" },
      { name: "Basil planter", price: 10, photo: "lib:basil", goto: "basil_planter" },
    ],
  },
  {
    arrange: "rows",
    density: "compact",
    items: [
      { name: "Training bites", sub: "Oat and pumpkin", price: 5, photo: "local:1", goto: "training_bites" },
      {
        name: "Trail bag",
        sub: "Mixed treats for long walks",
        price: 8,
        photo: "local:2",
        goto: "trail_bag",
      },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("ProductGrid");
export const probes = [
  choose("Browse several goods for sale in two columns with a photo, price, and quick add on each card"),
  choose(
    "Browse a collection of plant photos in a grid, without prices, products or purchase controls",
    "Gallery",
  ),
  write(
    "Make two-column shopping cards for a fern pot at 12, previously 16, and a basil planter at 10. Use lib:fern and lib:basil photos and open the named product pages.",
  ),
  {
    ...write(
      "Show bakery goods in menu rows instead of two columns: a sourdough loaf at 6, slow-fermented wheat, and an almond croissant at 4. Use local:1 and local:2 photos and link the named product pages.",
    ),
    variant: { axis: "arrange", value: "rows" },
  },
  read("Quickly add the basil planter to my basket without opening its details", {
    address: "p1/r2/add",
    action: "press",
  }),
] satisfies c.Probe[];

import { z } from "zod";
import * as c from "../../../catalog";

// Core first: Checklist/default cannot keep a target price and priority or add a purchase to owned stock.
export const meta = {
  id: "Wishlist",
  status: "draft",
  group: "input",
  purpose: "Prioritize things you want to buy and mark what you acquire.",
  pick: "A personal list of desired purchases with target prices, priority or a Got it action that adds an owned record. Not simple jobs to tick off (Checklist), gifts guests claim (Registry), or products for sale (ProductGrid).",
  writeHints: [
    "price and target are numeric amounts without a currency. Priority is a whole number from 1 to 3.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Wishes and acquired records live on the device; price tracking would need a service.",
  variants: { density: ["comfortable", "compact"] },
  parts: ["root"],
  items: { key: "items", parts: ["root", "name", "photo", "price", "target", "priority", "where", "got"] },
  confirmParts: ["got"],
  states: ["filled", "empty"],
  actions: { items: { got: ["press"], root: ["press"] } },
} as const satisfies c.Meta;

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  items: z
    .array(
      z.strictObject({
        name: c.text(28),
        photo: c.photo.optional(),
        price: z.number().nonnegative().optional(),
        target: z.number().nonnegative().optional(),
        priority: z.int().min(1).max(3),
        where: c.text(24).optional(),
      }),
    )
    .min(1)
    .max(6),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const items = c.itemsOf(cast, 3).map((row, i) => ({
    name: c.titleOf(row, 28, thing) ?? c.placeholderTitle(i, lang),
    where: c.detailOf(row, 24, thing),
    priority: 2,
  }));
  return { items: items.length ? items : [{ name: c.placeholderTitle(0, lang), priority: 2 }] };
}

export const examples = [
  {
    items: [
      {
        name: "Clip-on grow light",
        photo: "lib:plants",
        price: 36,
        target: 25,
        priority: 1,
        where: "Garden Supply",
      },
    ],
  },
  { density: "compact", items: [{ name: "Reflective lead", priority: 3, where: "Pet shop" }] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Wishlist");
export const probes = [
  choose(
    "Keep track of things I want to buy with a target price and priority, then move each to my owned items when I get it",
  ),
  choose(
    "Give me three household chores, each with its own tick box and a done or not done state",
    "Checklist",
  ),
  write(
    "I want a clip-on grow light from Garden Supply, currently 36, target 25, priority 1. Photo lib:plants.",
  ),
  read("I bought the clip-on grow light. Use the acquisition action, not the detail link.", {
    address: "w1/r1/got",
    action: "press",
  }),
] satisfies c.Probe[];

import { z } from "zod";
import * as c from "../../../catalog";

// Core first: KeyValue/default shows static facts, not purchase records with receipt and expiry states.
export const meta = {
  id: "Warranties",
  status: "draft",
  group: "data",
  purpose: "Find proof of purchase and see which warranties are ending.",
  pick: "Owned items' proof of purchase with receipt photos and warranty dates. Not static facts (KeyValue), travel documents (TravelDocs), or bills to pay (Bills).",
  writeHints: [
    "Use YYYY-MM-DD dates. Never write warranty status or a receipt URL; status follows from ends and a receipt is a photo reference.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Photographed receipts and purchase records are stored on the device.",
  variants: { density: ["comfortable", "compact"] },
  parts: ["root"],
  items: { key: "items", parts: ["root", "thing", "shop", "bought", "price", "ends", "receipt", "status"] },
  states: ["filled", "empty"],
  actions: { items: { root: ["press"] } },
} as const satisfies c.Meta;

const item = z
  .strictObject({
    thing: c.text(28),
    shop: c.text(20).optional(),
    bought: c.isoDate,
    price: z.number().nonnegative().optional(),
    ends: c.isoDate.optional(),
    receipt: c.photo.optional(),
  })
  .refine(({ bought, ends }) => !ends || bought <= ends, { path: ["ends"] });
export const props = z.strictObject({ ...c.variantProps(meta.variants), items: z.array(item).min(1).max(6) });

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const type = c.thingOf(cast);
  const row = c.itemsOf(cast, 1)[0];
  return {
    items: [
      { thing: (row && c.titleOf(row, 28, type)) ?? c.placeholderTitle(0, lang), bought: "2026-01-01" },
    ],
  };
}

export const examples = [
  {
    items: [
      {
        thing: "Grow lamp",
        shop: "Garden Supply",
        bought: "2025-12-02",
        price: 45,
        ends: "2026-12-02",
        receipt: "local:1",
      },
    ],
  },
  { density: "compact", items: [{ thing: "Travel crate", bought: "2024-06-10", ends: "2026-06-10" }] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Warranties");
export const probes = [
  choose(
    "Keep proof of purchase for my equipment with a photo of each receipt, and see which warranties expire soon",
  ),
  choose(
    "Show two static label-value facts about one chair: material oak and colour brown. No purchase date, receipt or expiry.",
    "KeyValue",
  ),
  write(
    "My grow lamp was bought from Garden Supply on 2025-12-02 for 45. Coverage ends 2026-12-02; receipt photo local:1.",
  ),
  read("Open the grow lamp's purchase record", { address: "w1/r1", action: "press" }),
] satisfies c.Probe[];

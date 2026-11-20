import { z } from "zod";
import {
  detailOf,
  itemsOf,
  placeholderTitle,
  probesFor,
  text,
  thingOf,
  titleOf,
  variantProps,
  type FallbackInput,
  type Meta,
  type Probe,
} from "../../../catalog";

const maxItems = 10;
const packedParts = Array.from({ length: maxItems }, (_, i) => `packed_${i + 1}`);
const packedActions = Object.fromEntries(packedParts.map((part) => [part, ["check"] as const]));

// Core first: Checklist/default cannot show grouped packing quantities with an overall packed share.
export const meta = {
  id: "PackingList",
  status: "draft",
  group: "input",
  purpose: "Pack by category or person, track quantities and see what remains.",
  pick: "Items to put in luggage, grouped by category or traveller, with optional quantities and an overall packed share. Not everyday tasks (Checklist) or shopping for groceries (GroceryList).",
  writeHints: ["Use 1–6 groups, each with 1–10 items. Write each packed flag; never write the packed share."],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "The list lives on the device; sharing across a family needs a shared app.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "plain"] },
  parts: ["root", "progress", "add"],
  items: { key: "groups", parts: ["root", "label", ...packedParts] },
  states: ["filled", "empty", "success"],
  actions: { parts: { add: ["type"] }, items: packedActions },
  emptyActions: ["add.type"],
  successActions: ["add.type"],
  read: (input, state) =>
    state === "filled"
      ? (input as { groups: z.output<typeof group>[] }).groups.map(
          ({ label, items }) =>
            `${label}: ${items.map(({ name, qty }) => (qty === undefined ? name : `${name} ×${qty}`)).join(", ")}`,
        )
      : [],
} as const satisfies Meta;

const item = z.strictObject({ name: text(28), qty: z.int().min(1).max(999).optional(), packed: z.boolean() });
const group = z
  .strictObject({
    label: text(16),
    items: z.array(item).min(1).max(maxItems),
  })
  .overwrite((value) => ({
    ...value,
    ...Object.fromEntries(packedParts.map((part, index) => [part, value.items[index]])),
  }));

export const props = z.strictObject({
  ...variantProps(meta.variants),
  groups: z.array(group).min(1).max(6),
});

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const items = itemsOf(cast, 3);
  const first = items[0];
  return {
    groups: [
      {
        label: (first && detailOf(first, 16, thing)) ?? placeholderTitle(0, lang),
        items: (items.length ? items : [undefined]).map((item, index) => ({
          name: (item && titleOf(item, 28, thing)) ?? placeholderTitle(index, lang),
          packed: false,
        })),
      },
    ],
  };
}

export const examples = [
  {
    groups: [
      {
        label: "Clothes",
        items: [
          { name: "T-shirts", qty: 3, packed: true },
          { name: "Rain jacket", packed: false },
        ],
      },
      { label: "Tech", items: [{ name: "Travel adapter", qty: 2, packed: false }] },
    ],
  },
  {
    density: "compact",
    surface: "plain",
    groups: [
      {
        label: "Sam",
        items: [
          { name: "Walking boots", packed: true },
          { name: "Spare socks", qty: 4, packed: true },
        ],
      },
      { label: "Jo", items: [{ name: "Warm hat", packed: false }] },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("PackingList");
export const probes = [
  choose("Tick off what goes in our suitcases, grouped by traveller with quantities and a packed percentage"),
  choose("Give me one simple ungrouped list of chores with a tick box for each", "Checklist"),
  write(
    "Make a luggage list: Clothes has three packed T-shirts and an unpacked rain jacket; Tech has two unpacked travel adapters.",
  ),
  read("Mark the rain jacket packed", { address: "p1/r1/packed_2", action: "check" }),
] satisfies Probe[];

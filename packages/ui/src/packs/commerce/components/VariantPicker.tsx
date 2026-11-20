import { z } from "zod";
import * as c from "../../../catalog";

// Core first: Choice/cards chooses plans, not one product's unavailable sizes or fixed colour swatches.
export const meta = {
  id: "VariantPicker",
  status: "draft",
  group: "input",
  purpose: "Choose an available size, colour or other option for one product.",
  pick: "Select the variant of one product, with optional price differences and disabled unavailable options. Not choosing a plan (Choice) or filtering a product list (Chips).",
  writeHints: [
    "Use zero-based at pointing to an available option, or omit it if unselected. Only swatch style takes a swatch on every option; named and size omit all swatches.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Variants are stored with their product on the device.",
  variants: { density: ["comfortable", "compact"] },
  parts: ["root", "label"],
  items: { key: "options", parts: ["root", "label", "swatch", "available", "extra"] },
  states: ["filled"],
  actions: { items: { root: ["select"] }, when: { root: { available: true } } },
  select: { prop: "at", value: "index" },
  read: (input, state, lang): string[] => {
    if (state !== "filled") return [];
    const { options } = input as { options: z.output<typeof optionProps>[] };
    return options.flatMap(({ label, extra }) =>
      extra === undefined
        ? []
        : [c.documentFieldLine(label, c.changeLine(extra, "money", undefined, lang), lang)],
    );
  },
} as const satisfies c.Meta;

const optionProps = z.strictObject({
  label: c.text(16),
  swatch: c.swatch.optional(),
  available: z.boolean(),
  extra: z.number().multipleOf(0.01).optional(),
});
export const props = z
  .strictObject({
    label: c.text(16),
    options: z.array(optionProps).min(2).max(6),
    at: z.int().min(0).max(5).optional(),
    style: z.enum(["named", "size", "swatch"]).default("named"),
    ...c.variantProps(meta.variants),
  })
  .refine(({ at, options }) => at === undefined || options[at]?.available === true, { path: ["at"] })
  .refine(
    ({ style, options }) => options.every(({ swatch }) => (style === "swatch") === (swatch !== undefined)),
    { path: ["options"] },
  );

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const items = c.itemsOf(cast, 3);
  return {
    label: c.clip(thing?.type.replace(/_/g, " ").trim() ?? "", 16) || c.placeholderLabel,
    options: Array.from({ length: Math.max(items.length, 2) }, (_, i) => {
      const item = items[i];
      return { label: (item && c.titleOf(item, 16, thing)) || c.placeholderTitle(i, lang), available: true };
    }),
  };
}

export const examples = [
  {
    style: "swatch",
    label: "Pot colour",
    at: 0,
    options: [
      { label: "Olive", swatch: "olive", available: true },
      { label: "Clay", swatch: "brown", available: true, extra: 2 },
      { label: "Cream", swatch: "beige", available: false },
    ],
  },
  {
    style: "size",
    density: "compact",
    label: "Harness size",
    options: [
      { label: "Small", available: true },
      { label: "Medium", available: false },
    ],
  },
  {
    label: "Lead finish",
    options: [
      { label: "Reflective", available: true },
      { label: "Matte", available: true },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("VariantPicker");
export const probes = [
  choose(
    "Choose a colour for one pot using fixed colour swatches, with sold-out colours disabled and the price difference per option",
  ),
  choose(
    "Choose between monthly and annual membership plans with prices and a description of each plan",
    "Choice",
  ),
  write(
    "Choose a pot colour using swatches: Olive is available and selected, Brown costs 2 extra, Beige is sold out.",
  ),
  read("Choose the available Clay colour for this pot", { address: "v1/r2", action: "select" }),
] satisfies c.Probe[];

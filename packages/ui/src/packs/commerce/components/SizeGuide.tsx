import { z } from "zod";
import * as c from "../../../catalog";

const units = ["cm", "in"] as const;

// Core first: KeyValue/rows lists facts for one record, not a selectable size matrix with convertible units.
export const meta = {
  id: "SizeGuide",
  status: "draft",
  group: "data",
  purpose: "Compare product measurements and fit across sizes before choosing one.",
  pick: "Compare garment or footwear measurements across sizes, switch centimetres and inches, and check how the product fits. Not facts about a single item (KeyValue), a generic data grid (Table), or choosing a purchasable option (VariantPicker).",
  writeHints: [
    "Use the unit of the supplied measurements. Keep each row's numbers in the same order as the columns; never write converted values separately.",
    'Use style "fit" only if fit and model information should come before the measurements. Use detail "brief" to hide the model note without dropping it from the data.',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "Measurement specifications are stored with the product record on the device.",
  variants: {
    density: ["comfortable", "compact"],
    surface: ["card", "outlined"],
    detail: ["full", "brief"],
  },
  variantParts: { "detail.brief": { hides: ["model_note"] } },
  parts: ["root", "unit", "table", "fit", "model_note"],
  items: { key: "rows", parts: ["root", "size"] },
  states: ["filled", "empty", "loading"],
  actions: { parts: { unit: ["select"] }, items: { root: ["select"] } },
  selections: { unit: { prop: "unit", choices: units } },
  select: { prop: "at", value: "index" },
} as const satisfies c.Meta;

const row = z.strictObject({
  size: c.text(10),
  values: z.array(z.number().nonnegative()).min(2).max(6),
});

export const props = z
  .strictObject({
    unit: z.enum(units).default("cm"),
    columns: z.array(c.text(12)).min(2).max(6),
    rows: z.array(row).min(2).max(10),
    at: z.int().min(0).max(9).optional(),
    fitScore: z.number().min(1).max(5).optional(),
    modelNote: c.text(60).optional(),
    style: z.enum(["table", "fit"]).default("table"),
    ...c.variantProps(meta.variants),
  })
  .refine(({ columns, rows }) => rows.every(({ values }) => values.length === columns.length), {
    path: ["rows"],
  })
  .refine(({ at, rows }) => at === undefined || at < rows.length, { path: ["at"] })
  .overwrite((value) => ({ ...value, measurementUnit: value.unit }));

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const items = c.itemsOf(cast, 3);
  return {
    columns: [c.placeholderTitle(0, lang), c.placeholderTitle(1, lang)],
    rows: Array.from({ length: Math.max(2, items.length) }, (_, i) => ({
      size: (items[i] && c.titleOf(items[i], 10, thing)) || c.clip(c.placeholderTitle(i, lang), 10),
      values: [0, 0],
    })),
  };
}

export const examples = [
  {
    columns: ["Rim", "Height"],
    rows: [
      { size: "Small", values: [12.7, 10.2] },
      { size: "Medium", values: [17.8, 15.2] },
      { size: "Large", values: [22.9, 20.3] },
    ],
    at: 1,
  },
  {
    unit: "in",
    style: "fit",
    surface: "outlined",
    density: "compact",
    columns: ["Chest", "Neck"],
    rows: [
      { size: "Small", values: [18, 12] },
      { size: "Medium", values: [22, 15] },
      { size: "Large", values: [26, 18] },
    ],
    fitScore: 2,
    modelNote: "Clover has a 22 in chest and wears a medium.",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("SizeGuide");
export const probes = [
  choose(
    "Compare chest and waist measurements across jacket sizes, switch between inches and centimetres, and see whether the jacket runs small",
  ),
  choose(
    "Show the room, light needs and watering interval of my one fern as simple label and value facts",
    "KeyValue",
  ),
  write(
    "Make a dog harness sizing chart in inches, with Chest and Neck columns: Small 18 and 12, Medium 22 and 15. It runs true to size.",
  ),
  {
    ...write(
      "Compare chest and neck in inches: Small 18 and 12, Medium 22 and 15. It runs small. Keep the note 'Clover is wearing a medium' in the data but hide the model note on screen.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Switch the measurement chart to inches without changing the reference size", {
    address: "s1/unit",
    action: "select",
    value: "in",
  }),
  read("Highlight Large as the reference size without changing the units", {
    address: "s1/r3",
    action: "select",
  }),
] satisfies c.Probe[];

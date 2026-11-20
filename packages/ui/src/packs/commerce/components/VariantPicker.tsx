import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { variantExtra, variantReading } from "../copy";
import { commerceWordsFor } from "../lang";

// Core first: Choice/cards chooses plans, not one product's unavailable sizes or fixed colour swatches.
export const meta = {
  id: "VariantPicker",
  status: "ready",
  group: "input",
  purpose: "Choose an available size, colour or other option for one product.",
  pick: "Select the variant of one product, with optional price differences and disabled unavailable options. Not choosing a plan (Choice) or filtering a product list (Chips).",
  writeHints: [
    "Use zero-based at pointing to an available option, or omit it if unselected. Only swatch style takes a swatch on every option; named and size omit all swatches.",
    'Keep supplied price differences in extra even when hidden. If asked only to hide them, write detail "brief", density null, and surface null. Otherwise write detail null. Use null for any finish not requested, never explicit defaults like surface "card" or density "comfortable".',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Variants are stored with their product on the device.",
  variants: {
    density: ["comfortable", "compact"],
    surface: ["card", "outlined"],
    detail: ["full", "brief"],
  },
  parts: ["root", "label", "options"],
  items: { key: "options", parts: ["root", "label", "swatch", "available", "extra"] },
  variantParts: { "detail.brief": { hides: ["extra"] } },
  states: ["filled"],
  actions: { items: { root: ["select"] }, when: { root: { available: true } } },
  select: { prop: "at", value: "index" },
  read: (input, state, lang): string[] => {
    if (state !== "filled") return [];
    const { detail, options } = input as z.output<typeof props>;
    return variantReading(options, detail, lang);
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
    label: c.clip(thing?.type.replace(/_/g, " ").trim() ?? "", 16) || c.wordsFor(lang).placeholderLabel,
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
  {
    ...write(
      "Let me choose the colour of one pot: Olive is selected, Clay costs 2 extra, and Cream is sold out. Show colour swatches and stock status, but keep the price differences off screen.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Choose the available Clay colour for this pot", { address: "v1/r2", action: "select" }),
] satisfies c.Probe[];

type PickerProps = c.Props<typeof props, typeof meta>;

function VariantOption({
  option,
  selected,
  style,
  detail,
  density,
}: {
  option: PickerProps["options"][number];
  selected: boolean;
  style: PickerProps["style"];
  detail: PickerProps["detail"];
  density: c.ThemeDensity;
}) {
  const scope = kit.usePartContext();
  const { lang, words } = kit.useWords(commerceWordsFor);
  const { id, label, swatch, available, extra } = option;
  const price = variantExtra(extra, detail, lang);
  return (
    <kit.PartScope {...scope} item={id}>
      <kit.KitContent density={density}>
        <kit.KitChip
          item={id}
          label={label}
          role="radio"
          on={selected}
          disabled={!available}
          look={style === "named" ? "pill" : "box"}
          {...(swatch ? { swatch, swatchPart: "swatch", dimSwatch: false } : {})}
        />
        {price !== undefined && (
          <kit.KitText
            part="extra"
            role="number"
            numberScale="compact"
            density="compact"
            align="center"
            tabular
          >
            {price}
          </kit.KitText>
        )}
        {!available && (
          <kit.KitText part="available" role="caption" tone="muted" align="center">
            {words.variantUnavailable}
          </kit.KitText>
        )}
      </kit.KitContent>
    </kit.PartScope>
  );
}

export function VariantPicker(input: PickerProps) {
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  return (
    <kit.KitContent align="center">
      <kit.KitCard part="root" padded density={density} surface={surface}>
        <kit.KitText part="label" role="heading" density={density}>
          {input.label}
        </kit.KitText>
        <kit.KitTrack part="options" role="radiogroup" label={input.label}>
          {input.options.map((option, index) => (
            <VariantOption
              key={option.id}
              {...{ option, density, detail }}
              style={input.style}
              selected={input.at === index}
            />
          ))}
        </kit.KitTrack>
      </kit.KitCard>
    </kit.KitContent>
  );
}

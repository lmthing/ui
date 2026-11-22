import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { shadeDepths, shadeGroups, shadeUndertones, variantExtra, variantReading } from "../copy";
import { commerceWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-VariantPicker.generated";

// Core first: Choice/cards chooses plans, not one product's unavailable sizes or fixed colour swatches.
export const meta = {
  id: "VariantPicker",
  status: "ready",
  group: "input",
  ...prompt,
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Variants are stored with their product on the device.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"], detail: ["full", "brief"] },
  parts: ["root", "label", "options"],
  items: {
    key: "options",
    parts: ["root", "label", "swatch", "available", "extra", "depth", "undertone", "shade_group"],
  },
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
  depth: z.enum(shadeDepths).optional(),
  undertone: z.enum(shadeUndertones).optional(),
  available: z.boolean(),
  extra: z.number().multipleOf(0.01).optional(),
});
// prettier-ignore
export const props = z
  .strictObject({
    label: c.text(16),
    options: z.array(optionProps).min(2).max(6),
    at: z.int().min(0).max(5).optional(),
    style: z.enum(["named", "size", "swatch", "shade"]).default("named"),
    ...c.variantProps(meta.variants),
  })
  .refine(({ at, options }) => at === undefined || options[at]?.available === true, { path: ["at"] })
  .refine(({ style, options }) => options.every(({ swatch }) => (style === "swatch") === (swatch !== undefined)), { path: ["options"] })
  .refine(({ style, options }) => options.every(({ depth, undertone }) =>
    style === "shade" ? !!depth && !!undertone : depth === undefined && undertone === undefined), { path: ["options"] });

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

// prettier-ignore
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
    options: [{ label: "Small", available: true }, { label: "Medium", available: false }],
  },
  {
    label: "Lead finish",
    options: [{ label: "Reflective", available: true }, { label: "Matte", available: true }],
  },
  { style: "shade", label: "Tint shade", options: [
    { label: "Almond", depth: "medium", undertone: "neutral", available: true },
    { label: "Sand", depth: "light", undertone: "warm", available: true },
    { label: "Shell", depth: "light", undertone: "cool", available: false },
  ], at: 1 },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("VariantPicker");
// prettier-ignore
export const probes = [
  choose("Choose a colour for one pot using fixed colour swatches, with sold-out colours disabled and the price difference per option"),
  choose("Choose between monthly and annual membership plans with prices and a description of each plan", "Choice"),
  write("Choose a pot colour using swatches: Olive is available and selected, Brown costs 2 extra, Beige is sold out. They are paint colours, with no shade depth or undertone data."),
  {
    ...write("Let me choose the colour of one pot: Olive is selected, Clay costs 2 extra, and Cream is sold out. Show colour swatches and stock status, but keep the price differences off screen."),
    variant: { axis: "detail", value: "brief" },
  },
  { ...write("Let me pick a tint shade grouped by depth and undertone: Shell is light cool and sold out; Almond is medium neutral and available. Use text labels, without swatch dots."),
    expectProps: { style: "shade", options: [{ depth: "light", undertone: "cool" }, { depth: "medium", undertone: "neutral" }] } },
  read("Choose the available Clay colour for this pot", { address: "v1/r2", action: "select" }),
] satisfies c.Probe[];

type PickerProps = c.Props<typeof props, typeof meta>;

// prettier-ignore
function VariantOption({ option, selected, style, detail, density }: {
  option: PickerProps["options"][number];
  selected: boolean;
  style: PickerProps["style"];
  detail: PickerProps["detail"];
  density: c.ThemeDensity;
}) {
  const scope = kit.usePartContext();
  const { lang, words } = kit.useWords(commerceWordsFor);
  const { id, label, swatch, available, extra, undertone } = option;
  const price = variantExtra(extra, detail, lang);
  return (
    <kit.PartScope {...scope} item={id}>
      <kit.KitContent density={density} align="center">
        <kit.KitChip
          item={id}
          label={label}
          role="radio"
          on={selected}
          disabled={!available}
          look={style === "named" ? "pill" : "box"}
          {...(swatch ? { swatch, swatchPart: "swatch", dimSwatch: false } : {})}
        />
        {undertone && (
          <kit.KitText part="undertone" role="caption" tone="muted" align="center">
            {words.shadeUndertone[undertone]}
          </kit.KitText>
        )}
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

// prettier-ignore
export function VariantPicker(input: PickerProps) {
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const { words } = kit.useWords(commerceWordsFor), scope = kit.usePartContext();
  const optionAt = (option: PickerProps["options"][number], index: number) =>
    <VariantOption key={option.id} {...{ option, density, detail }} style={input.style} selected={input.at === index} />;
  return <kit.KitCard part="root" padded {...{ density, surface }}>
      <kit.KitText part="label" role="heading" {...{ density }}>{input.label}</kit.KitText>
      {input.style === "shade" ? <kit.KitTrack part="options" role="radiogroup" label={input.label}><kit.KitContent {...{ density }}>
        {shadeGroups(input.options).map(({ depth, group }, index) => <kit.KitContent key={depth} group={index === 0 ? "content" : "response"} {...{ density }}>
          <kit.PartScope {...scope} item={group[0]!.option.id}>
            <kit.KitText part="depth" role="label" tone="muted" {...{ density }}>{words.shadeDepth[depth]}</kit.KitText>
            <kit.KitTrack part="shade_group" label={words.shadeDepth[depth]}>
              {group.map(({ option, index }) => optionAt(option, index))}
            </kit.KitTrack>
          </kit.PartScope>
        </kit.KitContent>)}
      </kit.KitContent></kit.KitTrack> : <kit.KitTrack part="options" role="radiogroup" label={input.label}>
        {input.options.map(optionAt)}
      </kit.KitTrack>}
  </kit.KitCard>;
}

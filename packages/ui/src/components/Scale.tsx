import { useVariant, useWords, KitCard, KitScaleTrack, KitText } from "../kit";
import {
  wordsFor,
  probesFor,
  goalLine,
  numberLine,
  itemsOf,
  text,
  thingOf,
  titleOf,
  variantProps,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { z } from "zod";
import { prompt } from "../entry/prompt-Scale.generated";

export const meta = {
  id: "Scale",
  group: "input",
  ...prompt,
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "A selected level is stored with a record in the on-device database.",
  variants: {
    density: ["comfortable", "compact"],
    emphasis: ["normal", "quiet", "hero"],
    detail: ["full", "brief"],
  },
  variantParts: { "detail.brief": { hides: ["meta"] } },
  parts: ["root", "label", "meta", "l1", "l2", "l3", "l4", "l5"],
  states: ["filled"],
  actions: {
    parts: { l1: ["select"], l2: ["select"], l3: ["select"], l4: ["select"], l5: ["select"] },
    // A rating that is only shown has no targets to act on.
    when: {
      l1: { readonly: false },
      l2: { readonly: false },
      l3: { readonly: false },
      l4: { readonly: false },
      l5: { readonly: false },
    },
  },
  read: (input: unknown, _state, lang?: string): string[] => {
    const { value, meta: note } = props.parse(input);
    return [`${numberLine(value, lang)} ${goalLine(5, lang)}`, ...(note ? [JSON.stringify(note)] : [])];
  },
} as const satisfies Meta;

export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    style: z.enum(["mood", "stars", "dots"]).default("dots"),
    label: text(32),
    value: z.number().min(0).max(5).multipleOf(0.5).default(0),
    readonly: z.boolean().default(false),
    meta: text(24).optional(),
  })
  .refine(({ readonly, value }) => readonly || Number.isInteger(value), {
    path: ["value"],
    message: "Half levels are only for a rating that is shown",
  })
  .refine(({ readonly, style }) => !readonly || style === "stars", {
    path: ["readonly"],
    message: "A shown rating uses stars",
  })
  .refine(({ readonly, meta: note }) => readonly || note === undefined, {
    path: ["meta"],
    message: "Meta is only for a shown rating",
  })
  .overwrite((value) => (value.detail === "brief" ? { ...value, meta: undefined } : value));

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const { placeholderDetail } = wordsFor(lang);

  const thing = thingOf(cast);
  const item = itemsOf(cast, 1)[0];
  const styles = ["stars", "dots", "mood"] as const;
  return {
    label: (item && titleOf(item, 32, thing)) || placeholderDetail,
    style: thing?.type ? styles[thing.type.length % styles.length]! : "dots",
    value: 0,
  };
}

const checkIn = { label: "Watering check-in", style: "dots", value: 3 } as const;
const rated = { label: "Rated by walkers", style: "stars", value: 4.5, readonly: true } as const;
export const examples = [
  { label: "How healthy does it look?", style: "mood", value: 3 },
  { label: "How was the walk?", style: "stars", value: 4 },
  { label: "How did it go? 1 low, 5 high", style: "dots", value: 0 },
  { ...rated, meta: "212 reviews" },
  checkIn,
  { ...checkIn, density: "compact" },
  { label: "How was the walk?", style: "stars", value: 4, emphasis: "quiet" },
  { label: "How was the walk?", style: "stars", value: 4, emphasis: "hero" },
  { ...rated, meta: "212 reviews", detail: "brief" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("Scale");
export const probes = [
  choose("Let me rate how today's walk went from one to five stars"),
  choose(
    "Switch the walk schedule between today, this week and all dates, showing one view at a time",
    "Segmented",
  ),
  write("Ask how healthy the plant looks with five faces, starting at three out of five"),
  write("Show that the dog park is rated 4.5 stars out of five by 212 walkers, only to look at"),
  {
    ...write(
      "Show Park rating as 4.5 stars out of five, not editable. Save the note 212 walkers but hide it.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Rate it 5", { address: "s1/l5", action: "select" }),
] satisfies Probe[];

export function Scale(input: Props<typeof props, typeof meta>) {
  const { style, label, value, readonly, emphasis, detail, meta: note } = input;
  const density = useVariant("density", meta.variants.density, input.density);
  const { lang } = useWords();
  const labels = [1, 2, 3, 4, 5].map((level) => `${numberLine(level, lang)} ${goalLine(5, lang)}`) as [
    string,
    string,
    string,
    string,
    string,
  ];
  return (
    <KitCard style="inset" part="root" padded density={density}>
      <KitText role="heading" part="label" density={density} emphasis={emphasis}>
        {label}
      </KitText>
      <KitScaleTrack style={style} value={value} labels={labels} readonly={readonly} />
      {detail === "full" && note && (
        <KitText role="caption" tone="muted" part="meta" density={density}>
          {note}
        </KitText>
      )}
    </KitCard>
  );
}

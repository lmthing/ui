import { useWords, KitCard, KitRing, KitSkeleton, KitText, useComponentState, useVariant } from "../kit";
import { z } from "zod";
import {
  probesFor,
  clip,
  goalLine,
  numberLine,
  placeholderTitle,
  text,
  thingOf,
  variantProps,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";

export const meta = {
  id: "Ring",
  signature: "ring_fill",
  group: "data",
  purpose: "How far you are toward one goal.",
  pick: "One amount completed toward a target. Not several targets at once (Progress), several summary numbers (Stats) or ordered stages of a process (Steps).",
  writeHints: [
    'To hide only the secondary caption, write detail "brief", density null, and emphasis null, and still store the caption in sub. Defaults such as comfortable and normal are not requests; a large focal ring uses emphasis "hero".',
    "For an ordinary value out of a target with a name but no extra caption, use density null, emphasis null, detail null and sub null. No caption given is not a request to hide one.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "A completed amount and its target derived from records in the on-device database.",
  variants: {
    density: ["comfortable", "compact"],
    emphasis: ["normal", "hero"],
    detail: ["full", "brief"],
  },
  variantParts: { "detail.brief": { hides: ["sub"] } },
  parts: ["root", "ring", "value", "label", "sub"],
  states: ["filled", "loading"],
  read: (input, state, lang?: string): string[] => {
    const { value, of } = props.parse(input);
    return state === "filled" ? [`${numberLine(value, lang)} ${goalLine(of, lang)}`] : [];
  },
} as const satisfies Meta;

export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    value: z.number().min(0),
    of: z.number().positive(),
    label: text(24),
    sub: text(48).optional(),
  })
  .overwrite((value) => (value.detail === "brief" ? { ...value, sub: undefined } : value));

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  return {
    value: 0,
    of: 1,
    label: clip(thingOf(cast)?.type.trim() || placeholderTitle(0, lang), 24),
  };
}

export const examples = [
  { value: 3, of: 5, label: "Watered today" },
  { emphasis: "hero", value: 9, of: 12, label: "Walks this week", sub: "3 to go" },
  { value: 9, of: 12, label: "Walks this week", sub: "3 to go" },
  { density: "compact", value: 9, of: 12, label: "Walks this week", sub: "3 to go" },
  { detail: "brief", value: 9, of: 12, label: "Walks this week", sub: "3 to go" },
] satisfies z.input<typeof props>[];

const { choose, write } = probesFor("Ring");
export const probes = [
  choose("Show three of the five plants I planned to water today as one amount completed out of the target"),
  choose("Show my total plants, the number watered today and the number due together", "Stats"),
  write("Show three of five plants watered today, labelled Watered today"),
  {
    ...write(
      "Show 4 out of 7 walks booked as one goal, labelled Walks booked. Store Morning route as the extra caption but hide it on screen.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
] satisfies Probe[];

export function Ring(input: Props<typeof props, typeof meta>) {
  const { value, of, label, sub } = input;
  const density = useVariant("density", meta.variants.density, input.density);
  const emphasis = useVariant("emphasis", meta.variants.emphasis, input.emphasis);
  const scale = emphasis === "hero" ? "lg" : "md";
  const { lang } = useWords();
  const state = useComponentState();
  if (state === "loading") {
    return (
      <KitCard style="inset" part="root" density={density}>
        <KitSkeleton shape="ring" ring={scale} lead="none" density={density} />
      </KitCard>
    );
  }
  return (
    <KitCard style="inset" part="root" padded density={density}>
      <KitRing value={value} of={of} scale={scale} part="ring">
        <KitText role="number" align="center" part="value" density={density}>
          {numberLine(value, lang)}
        </KitText>
        <KitText role="body" tone="muted" align="center" part={null} density={density}>
          {goalLine(of, lang)}
        </KitText>
      </KitRing>
      <KitText role="heading" align="center" part="label" density={density}>
        {label}
      </KitText>
      {sub && (
        <KitText role="body" tone="muted" align="center" part="sub" density={density}>
          {sub}
        </KitText>
      )}
    </KitCard>
  );
}

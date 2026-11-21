import { useVariant, useWords, KitAction, KitCard, KitGrid, KitText } from "../kit";
import {
  wordsFor,
  probesFor,
  numberLine,
  clip,
  localeOf,
  placeholderTitle,
  text,
  thingOf,
  variantProps,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { z } from "zod";

export const meta = {
  id: "Counter",
  group: "data",
  purpose: "Increase or decrease one running count by a fixed step with each tap.",
  pick: "One count whose plus button increments and minus button decrements the number by a fixed step. Not several read-only summary numbers (Stats) or a number entered in a form (Field).",
  writeHints: [
    'Write JSON null for unrequested axes, not the default values. An abbreviated count sets only figures "short", never density; preserve the exact value and step.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "A count stored on the device, changed by a fixed step with each tap.",
  variants: { density: ["comfortable", "compact"], figures: ["exact", "short"] },
  parts: ["root", "value", "label", "minus", "plus"],
  states: ["filled"],
  actions: { parts: { minus: ["decrement"], plus: ["increment"] } },
  read: (input, state, lang?: string): string[] => {
    const { stepLabels } = wordsFor(lang);

    if (state !== "filled") return [];
    const { value, unit, figures } = props.parse(input);
    const figure = countLine(value, figures, lang);
    return [
      unit ? `${figure} ${unit}` : figure,
      `"${stepLabels.less}" (decrement)`,
      `"${stepLabels.more}" (increment)`,
    ];
  },
} as const satisfies Meta;

export const props = z.strictObject({
  ...variantProps(meta.variants),
  label: text(24),
  value: z.int().min(0).default(0),
  unit: text(8).optional(),
  step: z.int().min(1).max(100).default(1),
});

function countLine(value: number, figures: "exact" | "short", lang?: string) {
  return figures === "short"
    ? compactCount(value, lang)
        .map((part) => part.value)
        .join("")
    : numberLine(value, lang);
}

function compactCount(value: number, lang?: string) {
  return new Intl.NumberFormat(localeOf(lang), { notation: "compact" }).formatToParts(value);
}

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const label = clip(thingOf(cast)?.type.trim() ?? "", 24) || placeholderTitle(0, lang);
  return { label, value: 0 };
}

export const examples = [
  { label: "Water glasses for fern", value: 2 },
  { label: "Dogs walked today", value: 3, unit: "dogs" },
  { label: "Walks logged", value: 1200, figures: "short" },
  { label: "Dogs walked today", value: 3, unit: "dogs", density: "compact" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("Counter");
export const probes = [
  choose("Let me add or remove one glass of water for my fern with a tap"),
  choose(
    "Show how many dogs I walked today, how many walks I booked and how much I earned together",
    "Stats",
  ),
  write("Show three dogs walked today, with dogs as the unit and one more or less per tap"),
  {
    ...write(
      "Show a count of 1,200 walks that I can add to or subtract from one at a time. Display 1.2K, but keep the exact count and the default spacing, with no density override.",
    ),
    variant: { axis: "figures", value: "short" },
  },
  read("Add one more", { address: "c1/plus", action: "increment" }),
] satisfies Probe[];

export function Counter(input: Props<typeof props, typeof meta>) {
  const { label, value, unit, figures } = input;
  const density = useVariant("density", meta.variants.density, input.density);
  const { lang, words } = useWords();
  const { stepLabels } = words;
  return (
    <KitCard style="inset" padded part="root" density={density}>
      <KitText role="heading" part="label" density={density}>
        {label}
      </KitText>
      <KitGrid columns={3} density={density}>
        <KitAction kind="secondary" icon="minus" a11y={stepLabels.less} part="minus" full />
        <KitText role="number" align="center" tabular part="value" density={density}>
          {figures === "short"
            ? compactCount(value, lang).map(({ type, value }, index) =>
                type === "compact" ? (
                  <KitText key={index} role="caption" part={null}>
                    {value}
                  </KitText>
                ) : (
                  value
                ),
              )
            : numberLine(value, lang)}
          {unit && (
            <KitText role="caption" tone="muted" part={null}>
              {" "}
              {unit}
            </KitText>
          )}
        </KitText>
        <KitAction kind="secondary" icon="plus" a11y={stepLabels.more} part="plus" full />
      </KitGrid>
    </KitCard>
  );
}

import { z } from "zod";
import {
  probesFor,
  clip,
  placeholderTitle,
  placeholderValue,
  text,
  thingOf,
  trendWord,
  variantProps,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { KitCard, KitGrid, KitSkeleton, KitSpark, KitText, useComponentState, useVariant } from "../kit";
import { prompt } from "../entry/prompt-Sparkline.generated";

export const meta = {
  id: "Sparkline",
  group: "data",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 1,
  tier: "phone",
  realPath: "Recent measurements of one field in the on-device database.",
  variants: {
    density: ["comfortable", "compact"],
    detail: ["full", "brief"],
    tone: ["neutral", "good", "warn", "bad"],
  },
  variantParts: { "detail.brief": { hides: ["line"] } },
  parts: ["root", "label", "value", "line"],
  states: ["filled", "loading"],
  read: (input, state, lang?: string): string[] => {
    if (state === "loading") return [];
    const { points, detail } = input as z.output<typeof props>;
    return detail === "brief" ? [] : [trendWord(points, lang)];
  },
} as const satisfies Meta;

export const props = z.strictObject({
  ...variantProps(meta.variants),
  label: text(24),
  value: text(10),
  points: z.array(z.number()).min(3).max(12),
});

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const type = thingOf(cast)?.type;
  return {
    label:
      typeof type === "string"
        ? clip(type.trim(), 24) || placeholderTitle(0, lang)
        : placeholderTitle(0, lang),
    value: placeholderValue,
    points: [0, 0, 0],
  };
}

export const examples = [
  {
    label: "Soil moisture",
    value: "18%",
    points: [42, 39, 35, 32, 28, 23, 18],
    tone: "warn",
  },
  {
    label: "Earnings this month",
    value: "€640",
    points: [80, 160, 240, 280, 400, 520, 640],
    tone: "good",
  },
  {
    label: "Walk attendance",
    value: "67%",
    points: [90, 82, 67],
  },
  {
    label: "Bookings filled",
    value: "30%",
    points: [60, 50, 30],
    tone: "bad",
  },
  { label: "Walk attendance", value: "67%", points: [90, 82, 67], detail: "brief" },
  { label: "Walk attendance", value: "67%", points: [90, 82, 67], density: "compact" },
  { label: "Soil moisture", value: "18%", points: [42, 39, 35, 32, 28, 23, 18] },
  { label: "Earnings this month", value: "€640", points: [80, 160, 240, 280, 400, 520, 640] },
  { label: "Bookings filled", value: "30%", points: [60, 50, 30] },
] satisfies z.input<typeof props>[];

const { choose, write } = probesFor("Sparkline");
export const probes = [
  choose("Show my plant's soil moisture at 18% now and how it has been falling recently"),
  choose("Show the amounts I earned on each day this week so I can compare the days", "Bars"),
  write("Soil moisture is 18% now, down from readings of 42, 35 and 28; warn me it is drying out"),
  {
    ...write(
      "For Walk attendance, record the series 90, 82, 67 and latest value 67%. Show the name and latest value, but hide the trend line.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
] satisfies Probe[];

export function Sparkline(input: Props<typeof props, typeof meta>) {
  const { label, value, points, tone, detail } = input;
  const density = useVariant("density", meta.variants.density, input.density);
  const state = useComponentState();
  const align = detail === "brief" ? "center" : "start";
  if (state === "loading") {
    return (
      <KitCard style="inset" padded part="root" density={density}>
        <KitSkeleton rows={1} lead="none" shape="trend" density={density} />
      </KitCard>
    );
  }
  const figure = (
    <KitText role="number" part="value" lines={1} tabular {...{ density, align }}>
      {value}
    </KitText>
  );
  return (
    <KitCard style="inset" padded part="root" {...{ density, align }}>
      <KitText role="label" tone="muted" part="label" {...{ density, align }}>
        {label}
      </KitText>
      {detail === "brief" ? (
        figure
      ) : (
        <KitGrid columns={2} density={density}>
          {figure}
          <KitSpark points={points} tone={tone === "neutral" ? "accent" : tone} part="line" />
        </KitGrid>
      )}
    </KitCard>
  );
}

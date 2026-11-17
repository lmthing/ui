import { z } from "zod";
import {
  clip,
  placeholderTitle,
  placeholderValue,
  text,
  thingOf,
  trendWord,
  type CastLike,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { KitCard, KitGrid, KitSkeleton, KitSpark, KitText, useComponentState } from "../kit";

export const meta = {
  id: "Sparkline",
  group: "data",
  purpose: "See how one measurement is changing, alongside its latest value.",
  pick: "One latest value with its recent rise or fall. Not separate amounts per day or category to compare (Bars), or several summary numbers (Stats).",
  region: "body",
  weight: 1,
  tier: "phone",
  realPath: "Recent measurements of one field in the on-device database.",
  parts: ["root", "label", "value", "line"],
  states: ["filled", "loading"],
  aliases: ["trend", "spark", "linechart"],
  read: (input, state) => {
    if (state === "loading") return [];
    const { points } = input as z.output<typeof props>;
    return [trendWord(points)];
  },
} as const satisfies Meta;

export const props = z.strictObject({
  label: text(24),
  value: text(10),
  points: z.array(z.number()).min(3).max(12),
  tone: z.enum(["neutral", "good", "warn", "bad"]).default("neutral"),
});

export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const type = thingOf(cast)?.type;
  return {
    label: typeof type === "string" ? clip(type.trim(), 24) || placeholderTitle(0) : placeholderTitle(0),
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
] satisfies z.input<typeof props>[];

export const probes = [
  {
    kind: "choose",
    need: "Show my plant's soil moisture at 18% now and how it has been falling recently",
    expect: "Sparkline",
  },
  {
    kind: "choose",
    need: "Show the amounts I earned on each day this week so I can compare the days",
    expect: "Bars",
  },
  {
    kind: "write",
    brief: "Soil moisture is 18% now, down from readings of 42, 35 and 28; warn me it is drying out",
    expect: "Sparkline",
  },
] satisfies Probe[];

export function Sparkline({ label, value, points, tone }: Props<typeof props, typeof meta>) {
  const state = useComponentState();
  if (state === "loading") {
    return (
      <KitCard style="inset" padded part="root">
        <KitSkeleton rows={1} lead="none" shape="trend" />
      </KitCard>
    );
  }
  return (
    <KitCard style="inset" padded part="root">
      <KitText role="label" tone="muted" part="label">
        {label}
      </KitText>
      <KitGrid columns={2}>
        <KitText role="number" part="value" lines={1} tabular>
          {value}
        </KitText>
        <KitSpark points={points} tone={tone === "neutral" ? "accent" : tone} part="line" />
      </KitGrid>
    </KitCard>
  );
}

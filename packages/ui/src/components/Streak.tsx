import { z } from "zod";
import {
  probesFor,
  clip,
  placeholderTitle,
  streakLine,
  text,
  thingOf,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
  variantProps,
} from "../catalog";
import { KitCard, KitContent, KitIcon, KitText, KitWeekStrip, useKit } from "../kit";
import { prompt } from "../entry/prompt-Streak.generated";

export const meta = {
  id: "Streak",
  signature: "streak_flame",
  group: "data",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Consecutive completed days and this week's completion derived from on-device habit records.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["days"] } },
  parts: ["root", "count", "label", "days"],
  states: ["filled"],
  read: (input, state, lang?: string): string[] => {
    if (state !== "filled") return [];
    const { count, days, detail } = props.parse(input);
    const lines = streakLine(count, days, lang);
    return detail === "brief" ? lines.slice(0, 1) : lines;
  },
} as const satisfies Meta;

export const props = z.strictObject({
  ...variantProps(meta.variants),
  count: z.int().min(0),
  label: text(24),
  days: z.array(z.boolean()).min(7).max(7),
});

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  return {
    count: 0,
    label: clip(thingOf(cast)?.type.trim() || placeholderTitle(0, lang), 24),
    days: Array.from({ length: 7 }, () => false),
  };
}

export const examples = [
  {
    count: 12,
    label: "days watering on time",
    days: [true, true, true, true, true, false, false],
  },
  {
    count: 5,
    label: "days walking",
    days: [true, true, true, true, false, false, false],
  },
  {
    count: 6,
    label: "days training recall",
    days: [true, true, true, true, true, true, false],
  },
  {
    count: 6,
    label: "days training recall",
    days: [true, true, true, true, true, true, false],
  },
  {
    count: 6,
    label: "days training recall",
    days: [true, true, true, true, true, true, false],
    detail: "brief",
  },
] satisfies z.input<typeof props>[];

const { choose, write } = probesFor("Streak");
export const probes = [
  choose("Show how many days in a row I watered on time and which days I did it this week"),
  choose("Show my total plants, how many were watered today and how many are due together", "Stats"),
  write(
    "Show 12 days in a row watering on time, labelled days watering on time, with Monday through Friday done and Saturday and Sunday not done",
  ),
  {
    ...write(
      "Show 6 consecutive days training recall. Save that Monday through Saturday are done and Sunday is not, but leave the weekly strip off screen.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
] satisfies Probe[];

export function Streak(input: Props<typeof props, typeof meta>) {
  const { count, label, days, detail } = input;
  const density = useKit().density;
  return (
    <KitCard style="inset" part="root" padded density={density}>
      <KitContent
        density={density}
        leadingAlign="row"
        lead={<KitIcon name="flame" tone="accent" scale="lg" decorative />}
      >
        <KitText role="display" part="count" tabular density={density}>
          {count}
          <KitText role="body" tone="muted" part="label" density={density}>
            {" "}
            {label}
          </KitText>
        </KitText>
      </KitContent>
      {detail === "full" && <KitWeekStrip days={days} part="days" />}
    </KitCard>
  );
}

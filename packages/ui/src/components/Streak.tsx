import { z } from "zod";
import {
  clip,
  placeholderTitle,
  streakLine,
  text,
  thingOf,
  type CastLike,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { KitCard, KitContent, KitIcon, KitText, KitWeekStrip } from "../kit";

export const meta = {
  id: "Streak",
  signature: "streak_flame",
  group: "data",
  purpose: "How many days in a row you kept a habit, with this week's completed days.",
  pick: "Consecutive days of a habit with daily completion this week. Not several independent totals (Stats) or your position in an ordered flow (Steps).",
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Consecutive completed days and this week's completion derived from on-device habit records.",
  parts: ["root", "count", "label", "days"],
  states: ["filled"],
  aliases: ["habit", "consecutive", "consistency"],
  read: (input, state) => {
    if (state !== "filled") return [];
    const { count, days } = props.parse(input);
    return streakLine(count, days);
  },
} as const satisfies Meta;

export const props = z.strictObject({
  count: z.int().min(0),
  label: text(24),
  days: z.array(z.boolean()).min(7).max(7),
});

export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  return {
    count: 0,
    label: clip(thingOf(cast)?.type.trim() || placeholderTitle(0), 24),
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
] satisfies z.input<typeof props>[];

export const probes = [
  {
    kind: "choose",
    need: "Show how many days in a row I watered on time and which days I did it this week",
    expect: "Streak",
  },
  {
    kind: "choose",
    need: "Show my total plants, how many were watered today and how many are due together",
    expect: "Stats",
  },
  {
    kind: "write",
    brief:
      "Show 12 days in a row watering on time, labelled days watering on time, with Monday through Friday done and Saturday and Sunday not done",
    expect: "Streak",
  },
] satisfies Probe[];

export function Streak({ count, label, days }: Props<typeof props, typeof meta>) {
  return (
    <KitCard style="inset" part="root" padded>
      <KitContent leadingAlign="row" lead={<KitIcon name="flame" tone="accent" scale="lg" decorative />}>
        <KitText role="display" part="count" tabular>
          {count}
          <KitText role="body" tone="muted" part="label">
            {" "}
            {label}
          </KitText>
        </KitText>
      </KitContent>
      <KitWeekStrip days={days} part="days" />
    </KitCard>
  );
}

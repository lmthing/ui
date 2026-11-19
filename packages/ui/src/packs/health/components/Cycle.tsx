import { z } from "zod";
import {
  detailOf,
  emptyLine,
  isoDate,
  itemsOf,
  probesFor,
  thingOf,
  titleOf,
  type CastLike,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";
import {
  cycleDayLine,
  cycleEstimate,
  cycleLabels,
  cycleNextLine,
  cycleReading,
  cycleToday,
  cycleWindowLine,
  type CycleSeed,
} from "../copy";
import {
  KitAction,
  KitCard,
  KitContent,
  KitEmpty,
  KitRadialTrack,
  KitText,
  useComponentState,
  useEmptyThing,
  type TextTone,
} from "../../../kit";

// Core first: Calendar/month cannot derive cycle phases, next period and a fertile window from period dates.
export const meta = {
  id: "Cycle",
  status: "ready",
  group: "data",
  purpose: "Follow logged menstrual periods and locally estimated cycle phases.",
  pick: "A menstrual cycle with period days, today's phase and estimated next period and fertile window. Not progress toward a goal (Ring), or dates merely marked with activity (Calendar).",
  writeHints: [
    "Write only start, average length and period duration. Predictions are computed locally and are not a method of contraception.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath:
    "Period dates stored only on the device, never shared; local predictions are not medical advice or a method of contraception.",
  parts: ["root", "day", "phase", "next", "window", "disclaimer", "log"],
  states: ["filled", "empty"],
  actions: { parts: { log: ["press"] } },
  read: (input, state) => (state === "filled" ? cycleReading(input as CycleSeed) : []),
} as const satisfies Meta;
export const props = z.strictObject({
  start: isoDate,
  length: z.int().min(21).max(40),
  period: z.int().min(2).max(10),
});
export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const thing = thingOf(cast);
  const start = itemsOf(cast, 6)
    .flatMap((item) => [titleOf(item, 32, thing), detailOf(item, 36, thing)])
    .find((value) => isoDate.safeParse(value).success);
  return { start: start ?? cycleToday(), length: 28, period: 5 };
}
export const examples = [
  { start: "2026-11-01", length: 28, period: 5 },
  { start: "2026-10-26", length: 32, period: 6 },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("Cycle");
export const probes = [
  choose(
    "Follow my menstrual cycle, showing today's cycle day, phase, predicted next period and fertile window",
  ),
  choose("Show a month of dates with dots on my planned walks, without cycle predictions", "Calendar"),
  write("Last period began 1 November 2026, average cycle 28 days and period lasts five days"),
  read("Log a new period", { address: "c1/log", action: "press" }),
] satisfies Probe[];

export function Cycle(input: Props<typeof props, typeof meta>) {
  const state = useComponentState();
  const thing = useEmptyThing();
  if (state === "empty") {
    return (
      <KitCard style="inset" part="root">
        <KitEmpty
          icon="calendar"
          part="phase"
          title={emptyLine(thing)}
          sub={cycleLabels.empty}
          decorativeIcon
        />
      </KitCard>
    );
  }
  const cycle = cycleEstimate(input);
  const segments = Array.from({ length: input.length }, (_, index) => {
    const day = index + 1;
    const tone: TextTone =
      day <= input.period ? "accent" : day >= cycle.fertileFrom && day <= cycle.fertileTo ? "good" : "muted";
    return { id: String(day), tone, current: day === cycle.day };
  });
  return (
    <KitCard style="inset" padded part="root">
      <KitRadialTrack style="days" segments={segments} part="day">
        <KitText role="number" align="center" part={null} tabular>
          {cycleDayLine(cycle.day)}
        </KitText>
        <KitText role="body" tone="muted" align="center" part="phase">
          {cycle.phase}
        </KitText>
      </KitRadialTrack>
      <KitContent lineRole="body">
        <KitText role="label" tone="muted" align="center" part="next">
          {cycleNextLine(cycle.next)}
        </KitText>
        <KitText role="label" tone="muted" align="center" part="window">
          {cycleWindowLine(cycle.windowStart, cycle.windowEnd)}
        </KitText>
      </KitContent>
      <KitAction label={cycleLabels.log} part="log" full />
      <KitText role="label" tone="muted" align="center" part="disclaimer">
        {cycleLabels.disclaimer}
      </KitText>
    </KitCard>
  );
}

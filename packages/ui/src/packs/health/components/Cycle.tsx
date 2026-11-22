import {
  useWords,
  KitAction,
  KitCard,
  KitContent,
  KitEmpty,
  KitRadialTrack,
  KitText,
  useComponentState,
  useEmptyThing,
  useVariant,
  type TextTone,
} from "../../../kit";
import { healthWordsFor } from "../lang";
import { z } from "zod";
import {
  detailOf,
  emptyLine,
  isoDate,
  itemsOf,
  probesFor,
  thingOf,
  titleOf,
  variantProps,
  type CastLike,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";
import {
  cycleDayLine,
  cycleEstimate,
  cycleNextLine,
  cycleReading,
  cycleToday,
  cycleWindowLine,
  type CycleSeed,
} from "../copy";

// Core first: Calendar/month cannot derive cycle phases, next period and a fertile window from period dates.
export const meta = {
  id: "Cycle",
  status: "ready",
  group: "data",
  purpose: "Follow logged menstrual periods and locally estimated cycle phases.",
  pick: "A menstrual cycle with period days, today's phase and estimated next period and fertile window. Not progress toward a goal (Progress), or dates merely marked with activity (Calendar).",
  writeHints: [
    "Write the start, average length and period duration. Predictions are computed locally and are not a method of contraception.",
    "Write surface null unless asked for an outline. Do not write the default surface card. Use detail brief only to omit the estimated next-period and fertile-window captions.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath:
    "Period dates stored only on the device, never shared; local predictions are not medical advice or a method of contraception.",
  variants: { surface: ["card", "outlined"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["next", "window"] } },
  parts: ["root", "day", "phase", "next", "window", "disclaimer", "log"],
  states: ["filled", "empty"],
  actions: { parts: { log: ["press"] } },
  read: (input, state, lang?: string) =>
    state === "filled" ? cycleReading(input as CycleSeed & { detail?: "full" | "brief" }, lang) : [],
} as const satisfies Meta;
export const props = z.strictObject({
  ...variantProps(meta.variants),
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
  { start: "2026-10-26", length: 32, period: 6, surface: "outlined" },
  { start: "2026-11-01", length: 28, period: 5, detail: "brief" },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("Cycle");
export const probes = [
  choose(
    "Follow my menstrual cycle, showing today's cycle day, phase, predicted next period and fertile window",
  ),
  choose("Show a month of dates with dots on my planned walks, without cycle predictions", "Calendar"),
  write("Last period began 1 November 2026, average cycle 28 days and period lasts five days"),
  {
    ...write(
      "Last period began November 1, 2026; average cycle 28 days and period five days. Show the cycle ring with today's phase, but leave off the next-period and fertile-window captions. Keep Log period and the disclaimer.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Log a new period", { address: "c1/log", action: "press" }),
] satisfies Probe[];

export function Cycle(input: Props<typeof props, typeof meta>) {
  const { lang, words } = useWords(healthWordsFor);
  const { cycleLabels } = words;
  const state = useComponentState();
  const thing = useEmptyThing();
  const full = useVariant("detail", meta.variants.detail, input.detail) === "full";
  if (state === "empty") {
    return (
      <KitCard style="inset" part="root" surface={input.surface}>
        <KitEmpty
          icon="calendar"
          part="phase"
          title={emptyLine(thing, lang)}
          sub={cycleLabels.empty}
          decorativeIcon
        />
      </KitCard>
    );
  }
  const cycle = cycleEstimate(input, undefined, lang);
  const segments = Array.from({ length: input.length }, (_, index) => {
    const day = index + 1;
    const tone: TextTone =
      day <= input.period ? "accent" : day >= cycle.fertileFrom && day <= cycle.fertileTo ? "text" : "muted";
    return { id: String(day), tone, current: day === cycle.day };
  });
  return (
    <KitCard style="inset" padded part="root" surface={input.surface}>
      <KitRadialTrack style="days" segments={segments} part="day">
        <KitText role="number" align="center" part={null} tabular>
          {cycleDayLine(cycle.day, lang)}
        </KitText>
        <KitText role="body" tone="muted" align="center" part="phase">
          {cycle.phase}
        </KitText>
      </KitRadialTrack>
      {full && (
        <KitContent lineRole="body">
          <KitText role="label" tone="muted" align="center" part="next">
            {cycleNextLine(cycle.next, lang)}
          </KitText>
          <KitText role="label" tone="muted" align="center" part="window">
            {cycleWindowLine(cycle.windowStart, cycle.windowEnd, lang)}
          </KitText>
        </KitContent>
      )}
      <KitAction label={cycleLabels.log} part="log" full />
      <KitText role="label" tone="muted" align="center" part="disclaimer">
        {cycleLabels.disclaimer}
      </KitText>
    </KitCard>
  );
}

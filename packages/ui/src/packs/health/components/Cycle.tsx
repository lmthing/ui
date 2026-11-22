import { z } from "zod";
// prettier-ignore
import { useWords, KitAction, KitCard, KitContent, KitEmpty, KitRadialTrack, KitText, useComponentState, useEmptyThing, useVariant, type TextTone } from "../../../kit";
// prettier-ignore
import { detailOf, emptyLine, isoDate, itemsOf, probesFor, screenId, thingOf, titleOf, variantProps, type CastLike, type Meta, type Probe, type Props } from "../../../catalog";
import {
  cycleDayLine,
  cycleEstimate,
  cycleNextLine,
  cycleReading,
  cycleToday,
  cycleWindowLine,
} from "../copy";
import { healthWordsFor } from "../lang";

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
    'Set mode "conceive" if trying to conceive, or "pregnancy" if already pregnant. Otherwise use null. Keep the supplied cycle dates and lengths in all modes; pregnancy mode does not show estimates.',
    "For a link to the symptom log, write symptoms {goto} using the requested screen id. Otherwise symptoms is null.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath:
    "Period dates stored only on the device, never shared; local predictions are not medical advice or a method of contraception.",
  variants: { surface: ["card", "outlined"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["next", "window"] } },
  parts: ["root", "day", "phase", "next", "window", "disclaimer", "log", "mode", "symptoms"],
  states: ["filled", "empty"],
  actions: { parts: { log: ["press"], symptoms: ["press"] }, when: { log: { canLog: true } } },
  read: (input, state, lang?: string): string[] =>
    state === "filled" ? cycleReading(input as z.output<typeof props>, lang) : [],
} as const satisfies Meta;
export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    start: isoDate,
    length: z.int().min(21).max(40),
    period: z.int().min(2).max(10),
    mode: z.enum(["track", "conceive", "pregnancy"]).default("track"),
    symptoms: z.strictObject({ goto: screenId }).optional(),
  })
  .overwrite((value) => ({ ...value, canLog: value.mode !== "pregnancy", symptoms: value.symptoms }));
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
  { start: "2026-11-01", length: 28, period: 5, mode: "conceive" },
  { start: "2026-10-03", length: 28, period: 5, mode: "pregnancy", symptoms: { goto: "symptom_log" } },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("Cycle");
// prettier-ignore
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
  {
    ...write("I'm trying to conceive. My last period started November 1, 2026, my cycle averages 28 days, and my period lasts five days."),
    fields: { mode: "conceive" },
  },
  {
    ...write("I'm already pregnant. Put my cycle tracker in pregnancy mode. My last period began October 3, 2026, with an average 28-day cycle and a five-day period."),
    fields: { mode: "pregnancy" },
  },
  {
    ...write("My last period began November 1, 2026, my average cycle is 28 days, and my period lasts five days. Add a link to the symptom log screen, symptom_log."),
    fields: { "symptoms.goto": "symptom_log" },
  },
  read("Open the symptom log", { address: "c1/symptoms", action: "press" }, 4),
] satisfies Probe[];

type CycleProps = Props<typeof props, typeof meta>;
function SymptomsLink({ goto, label }: { goto: string | undefined; label: string }) {
  return goto && <KitAction label={label} part="symptoms" kind="secondary" goto={goto} full />;
}
export function Cycle(input: CycleProps) {
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
  if (input.mode === "pregnancy")
    return (
      <KitCard style="inset" padded part="root" surface={input.surface}>
        <KitContent>
          <KitText role="heading" align="center" part="mode">
            {cycleLabels.pregnancy}
          </KitText>
          <KitText role="body" tone="muted" align="center" part={null}>
            {cycleLabels.pregnancyDetail}
          </KitText>
        </KitContent>
        <SymptomsLink goto={input.symptoms?.goto} label={cycleLabels.symptoms} />
      </KitCard>
    );
  return <CycleTrack input={input} full={full} />;
}

function CycleTrack({ input, full }: { input: CycleProps; full: boolean }) {
  const {
    lang,
    words: { cycleLabels },
  } = useWords(healthWordsFor);
  const conceive = input.mode === "conceive";
  const cycle = cycleEstimate(input, undefined, lang);
  const periodTone = conceive ? "text" : "accent";
  const fertileTone = conceive ? (full ? "accent" : "muted") : "text";
  const segments = Array.from({ length: input.length }, (_, index) => {
    const day = index + 1;
    const tone: TextTone =
      day <= input.period
        ? periodTone
        : day >= cycle.fertileFrom && day <= cycle.fertileTo
          ? fertileTone
          : "muted";
    return { id: String(day), tone, current: day === cycle.day };
  });
  return (
    <KitCard style="inset" padded part="root" surface={input.surface}>
      {conceive && (
        <KitText role="label" tone="muted" align="center" part="mode">
          {cycleLabels.conceive}
        </KitText>
      )}
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
          <KitText role="label" tone={conceive ? "accent" : "muted"} align="center" part="window">
            {cycleWindowLine(cycle.windowStart, cycle.windowEnd, lang)}
          </KitText>
        </KitContent>
      )}
      <KitAction label={cycleLabels.log} part="log" full />
      <SymptomsLink goto={input.symptoms?.goto} label={cycleLabels.symptoms} />
      <KitText role="label" tone="muted" align="center" part="disclaimer">
        {cycleLabels.disclaimer}
      </KitText>
    </KitCard>
  );
}

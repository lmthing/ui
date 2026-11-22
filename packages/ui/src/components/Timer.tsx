import { useWords, KitAction, KitCard, KitContent, KitGrid, KitRow, KitText, useKit } from "../kit";
// prettier-ignore
import { wordsFor, probesFor, clip, clockLine, clock, isoDate, leftLine, localeOf, placeholderTitle,
  text, thingOf, type FallbackInput, type Meta, type Probe, type Props,
  variantProps,
} from "../catalog";
import { z } from "zod";

export const meta = {
  id: "Timer",
  status: "ready",
  signature: "timer_spin",
  group: "data",
  purpose: "Measure time remaining or elapsed, with controls to start and stop.",
  pick: "Time remaining until an activity ends or elapsed since it began. Not a number manually nudged up or down (Counter) or an amount completed toward a goal (Progress).",
  writeHints: [
    'A shortened running time sets only figures to "short"; keep exact seconds. Do not output default axis values.',
    'A countdown to a calendar date uses style "until", a date in until, and null for seconds; down and up use seconds instead.',
    'A stopwatch with an elapsed-time target uses style "up" and goal in seconds. Keep elapsed seconds separate from the goal.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "A countdown or stopwatch based on timestamps stored on the phone.",
  variants: { figures: ["exact", "short"] },
  parts: ["root", "time", "label", "start", "stop", "goal"],
  states: ["filled"],
  clocks: [
    {
      id: "timer",
      kind: "down",
      from: "seconds",
      prop: "seconds",
      max: 86400,
      when: { style: "down" },
      start: { part: "start", action: "start" },
      stop: { part: "stop", action: "stop" },
    },
    {
      id: "timer",
      kind: "up",
      from: "seconds",
      prop: "seconds",
      max: 86400,
      when: { style: "up" },
      start: { part: "start", action: "start" },
      stop: { part: "stop", action: "stop" },
    },
    { id: "date", kind: "until", from: "until", at: "at", when: { style: "until" } },
  ],
  // A countdown to a date has nothing to start or stop.
  actions: {
    parts: { start: ["start"], stop: ["stop"] },
    when: { start: { controls: true }, stop: { controls: true } },
  },
  read: (input, state, lang?: string): string[] => {
    const { timerLabels } = wordsFor(lang);

    // Already parsed by the validator: it carries the derived `controls`, which a strict parse would refuse.
    const value = input as z.output<typeof props>;
    if (state !== "filled") return [];
    if (value.style === "until") return [leftLine(untilMs(value), lang)];
    const goal = value.goal === undefined ? [] : [timerGoal(value.goal, lang)];
    return [`${timerLine(value, lang)} ${value.style}`, ...goal, timerLabels.start, timerLabels.stop];
  },
} as const satisfies Meta;

export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    style: z.enum(["down", "up", "until"]).default("down"),
    label: text(24),
    seconds: z.number().int().min(0).max(86400).optional(),
    goal: z.number().int().min(1).max(86400).optional(),
    until: isoDate.optional(),
    at: clock.optional(),
  })
  .refine(({ style, seconds }) => (style === "until") === (seconds === undefined), {
    path: ["seconds"],
    message: "Seconds for down and up, not for until",
  })
  .refine(({ style, until }) => (style === "until") === (until !== undefined), {
    path: ["until"],
    message: "A date for until only",
  })
  .refine(({ style, at }) => style === "until" || at === undefined, {
    path: ["at"],
    message: "Time is for until",
  })
  .refine(({ style, goal }) => style === "up" || goal === undefined, { path: ["goal"] })
  // Derived, never written: start and stop exist only for down and up.
  .overwrite((value) => ({ ...value, controls: value.style !== "until" }));

function untilMs({ until, at }: { until?: string | undefined; at?: string | undefined }): number {
  return new Date(`${until}T${at ?? "00:00"}`).getTime() - Date.now();
}

function timerLine(
  { seconds = 0, figures }: Pick<z.output<typeof props>, "seconds" | "figures">,
  lang?: string,
) {
  if (figures !== "short") return clockLine(seconds, lang);
  const [unit, divisor] = seconds >= 3600 ? ["hour", 3600] : seconds >= 60 ? ["minute", 60] : ["second", 1];
  return new Intl.NumberFormat(localeOf(lang), { style: "unit", unit, unitDisplay: "short" }).format(
    Math.floor(seconds / divisor),
  );
}

const timerGoal = (goal: number, lang?: string) => wordsFor(lang).goal(clockLine(goal, lang));

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  return {
    style: "up",
    label: clip(thingOf(cast)?.type.trim() || placeholderTitle(0, lang), 24),
    seconds: 0,
  };
}

export const examples = [
  { style: "down", label: "Soak the orchid", seconds: 600 },
  { style: "up", label: "Walk timer", seconds: 1260 },
  { style: "until", label: "Our wedding day", until: "2030-06-14", at: "14:00" },
  { style: "up", label: "Walk timer", seconds: 1260 },
  { style: "up", label: "Walk timer", seconds: 1260, figures: "short" },
  { style: "up", label: "Walk timer", seconds: 1260, goal: 1800 },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("Timer");
export const probes = [
  choose("Show how much time remains in the orchid's ten-minute soak, with controls to begin and end it"),
  choose("Let me add or subtract one from the number of dogs on a walk", "Counter"),
  write("Show the walk's elapsed time of 21 minutes, labelled Walk timer, with controls to begin and end it"),
  write("Count down the days left until our wedding on 14 June 2030 at 2pm, labelled Our wedding day"),
  {
    ...write(
      "Time the orchid soak with start and stop. Keep 650 seconds as the starting value but show only whole minutes, like 10 min instead of 10:50.",
    ),
    variant: { axis: "figures", value: "short" },
  },
  read("Start the timer", { address: "t1/start", action: "start" }),
  {
    ...write("Count up from 21 minutes elapsed on the walk and show a 30-minute goal."),
    expectProps: { style: "up", seconds: 1260, goal: 1800 },
  },
] satisfies Probe[];

// prettier-ignore
export function Timer(input: Props<typeof props, typeof meta>) {
  const { style, label, figures, goal } = input;
  const density = useKit().density;
  const { lang, words } = useWords();
  const { timerLabels } = words;
  const controls = style !== "until";
  const value = controls ? timerLine(input, lang) : leftLine(untilMs(input), lang);
  const [amount, ...suffix] = value.split(" ");
  const start = <KitAction label={timerLabels.start} kind={goal === undefined ? "primary" : "secondary"} part="start" full />;
  const stop = <KitAction label={timerLabels.stop} kind={goal === undefined ? "secondary" : "quiet"} part="stop" full />;
  const readout = (
    <>
      <KitText role="number" align="center" tabular part="time" density={density}>
        {amount}
        {(!controls || figures === "short") && (
          <KitText role={goal === undefined ? "caption" : "label"} tone="muted" part={null}>{` ${suffix.join(" ")}`}</KitText>
        )}
        {goal !== undefined && <KitText role="label" tone="muted" part="goal">
          {`\u2002${timerGoal(goal, lang)}`}
        </KitText>}
      </KitText>
      <KitText role="body" tone="muted" align="center" part="label" density={density}>
        {label}
      </KitText>
    </>
  );
  return (
    <KitCard style="inset" part="root" padded density={density}>
      {density === "compact" ? (
        <KitRow label={label} part={null} inline density={density}>
          {readout}
        </KitRow>
      ) : (
        <KitContent density={density}>{readout}</KitContent>
      )}
      {controls &&
        (density === "compact"
          ? <KitContent group="response" density={density}>
              <KitGrid columns={2} density={density}>{start}{stop}</KitGrid>
            </KitContent>
          : <>{start}{stop}</>)}
    </KitCard>
  );
}

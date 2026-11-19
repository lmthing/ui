import { useWords, KitAction, KitCard, KitContent, KitText } from "../kit";
import {
  wordsFor,
  probesFor,
  clip,
  clockLine,
  clock,
  isoDate,
  leftLine,
  placeholderTitle,
  text,
  thingOf,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { z } from "zod";

export const meta = {
  id: "Timer",
  signature: "timer_spin",
  group: "data",
  purpose: "Measure time remaining or elapsed, with controls to start and stop.",
  pick: "Time remaining until an activity ends or elapsed since it began. Not a number manually nudged up or down (Counter) or an amount completed toward a goal (Ring).",
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "A countdown or stopwatch based on timestamps stored on the phone.",
  parts: ["root", "time", "label", "start", "stop"],
  states: ["filled"],
  // A countdown to a date has nothing to start or stop.
  actions: {
    parts: { start: ["start"], stop: ["stop"] },
    when: { start: { controls: true }, stop: { controls: true } },
  },
  read: (input, state, lang?: string) => {
    const { timerLabels } = wordsFor(lang);

    // Already parsed by the validator: it carries the derived `controls`, which a strict parse would refuse.
    const value = input as z.output<typeof props>;
    if (state !== "filled") return [];
    if (value.style === "until") return [leftLine(untilMs(value), lang)];
    return [`${clockLine(value.seconds ?? 0, lang)} ${value.style}`, timerLabels.start, timerLabels.stop];
  },
} as const satisfies Meta;

export const props = z
  .strictObject({
    style: z.enum(["down", "up", "until"]).default("down"),
    label: text(24),
    seconds: z.number().int().min(0).max(86400).optional(),
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
  // Derived, never written: start and stop exist only for down and up.
  .overwrite((value) => ({ ...value, controls: value.style !== "until" }));

function untilMs({ until, at }: { until?: string | undefined; at?: string | undefined }): number {
  return new Date(`${until}T${at ?? "00:00"}`).getTime() - Date.now();
}

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
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("Timer");
export const probes = [
  choose("Show how much time remains in the orchid's ten-minute soak, with controls to begin and end it"),
  choose("Let me add or subtract one from the number of dogs on a walk", "Counter"),
  write("Show the walk's elapsed time of 21 minutes, labelled Walk timer, with controls to begin and end it"),
  write("Count down the days left until our wedding on 14 June 2030 at 2pm, labelled Our wedding day"),
  read("Start the timer", { address: "t1/start", action: "start" }),
] satisfies Probe[];

export function Timer({ style, label, seconds, ...rest }: Props<typeof props, typeof meta>) {
  const { lang, words } = useWords();
  const { timerLabels } = words;
  const controls = style !== "until";
  const [amount, ...suffix] = controls ? [] : leftLine(untilMs(rest), lang).split(" ");
  return (
    <KitCard style="inset" part="root" padded>
      <KitContent>
        <KitText role="number" align="center" tabular part="time">
          {controls ? (
            clockLine(seconds ?? 0, lang)
          ) : (
            <>
              {amount}
              <KitText role="caption" tone="muted" part={null}>{` ${suffix.join(" ")}`}</KitText>
            </>
          )}
        </KitText>
        <KitText role="body" tone="muted" align="center" part="label">
          {label}
        </KitText>
      </KitContent>
      {controls && <KitAction label={timerLabels.start} kind="primary" part="start" full />}
      {controls && <KitAction label={timerLabels.stop} kind="secondary" part="stop" full />}
    </KitCard>
  );
}

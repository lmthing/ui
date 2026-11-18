import { z } from "zod";
import {
  clip,
  clockLine,
  clock,
  isoDate,
  leftLine,
  placeholderTitle,
  text,
  thingOf,
  timerLabels,
  type CastLike,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { KitAction, KitCard, KitContent, KitText } from "../kit";

export const meta = {
  id: "Timer",
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
  aliases: ["countdown", "stopwatch", "duration"],
  read: (input, state) => {
    // Already parsed by the validator: it carries the derived `controls`, which a strict parse would refuse.
    const value = input as z.output<typeof props>;
    if (state !== "filled") return [];
    if (value.style === "until") return [leftLine(untilMs(value))];
    return [`${clockLine(value.seconds ?? 0)} ${value.style}`, timerLabels.start, timerLabels.stop];
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

export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  return {
    style: "up",
    label: clip(thingOf(cast)?.type.trim() || placeholderTitle(0), 24),
    seconds: 0,
  };
}

export const examples = [
  { style: "down", label: "Soak the orchid", seconds: 600 },
  { style: "up", label: "Walk timer", seconds: 1260 },
  { style: "until", label: "Our wedding day", until: "2030-06-14", at: "14:00" },
] satisfies z.input<typeof props>[];

export const probes = [
  {
    kind: "choose",
    need: "Show how much time remains in the orchid's ten-minute soak, with controls to begin and end it",
    expect: "Timer",
  },
  {
    kind: "choose",
    need: "Let me add or subtract one from the number of dogs on a walk",
    expect: "Counter",
  },
  {
    kind: "write",
    brief:
      "Show the walk's elapsed time of 21 minutes, labelled Walk timer, with controls to begin and end it",
    expect: "Timer",
  },
  {
    kind: "write",
    brief: "Count down the days left until our wedding on 14 June 2030 at 2pm, labelled Our wedding day",
    expect: "Timer",
  },
  {
    kind: "read",
    screen: 0,
    task: "Start the timer",
    expect: { address: "t1/start", action: "start" },
  },
] satisfies Probe[];

export function Timer({ style, label, seconds, ...rest }: Props<typeof props, typeof meta>) {
  const controls = style !== "until";
  return (
    <KitCard style="inset" part="root" padded>
      <KitContent>
        <KitText role="number" align="center" tabular part="time">
          {controls ? clockLine(seconds ?? 0) : leftLine(untilMs(rest))}
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

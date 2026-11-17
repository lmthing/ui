import { z } from "zod";
import {
  clip,
  clockLine,
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
  actions: { parts: { start: ["start"], stop: ["stop"] } },
  aliases: ["countdown", "stopwatch", "duration"],
  read: (input, state) => {
    const { seconds, style } = props.parse(input);
    return state === "filled" ? [`${clockLine(seconds)} ${style}`, timerLabels.start, timerLabels.stop] : [];
  },
} as const satisfies Meta;

export const props = z.strictObject({
  style: z.enum(["down", "up"]).default("down"),
  label: text(24),
  seconds: z.number().int().min(0).max(86400),
});

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
    kind: "read",
    screen: 0,
    task: "Start the timer",
    expect: { address: "t1/start", action: "start" },
  },
] satisfies Probe[];

export function Timer({ label, seconds }: Props<typeof props, typeof meta>) {
  return (
    <KitCard style="inset" part="root" padded>
      <KitContent>
        <KitText role="number" align="center" tabular part="time">
          {clockLine(seconds)}
        </KitText>
        <KitText role="body" tone="muted" align="center" part="label">
          {label}
        </KitText>
      </KitContent>
      <KitAction label={timerLabels.start} kind="primary" part="start" full />
      <KitAction label={timerLabels.stop} kind="secondary" part="stop" full />
    </KitCard>
  );
}

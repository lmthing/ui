import { z } from "zod";
import {
  probesFor,
  stepLine,
  text,
  type CastLike,
  type Meta,
  type Probe,
  type Props,
  variantProps,
} from "../catalog";
import { KitBlock, KitContent, KitStepsTrack, KitText, useWords, useKit } from "../kit";
import { prompt } from "../entry/prompt-Steps.generated";

export const meta = {
  id: "Steps",
  group: "structure",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "top",
  weight: 1,
  tier: "phone",
  realPath: "The current position in a flow stored in the on-device app.",
  variants: { detail: ["full", "brief"] },
  parts: ["root", "track", "label"],
  states: ["filled"],
  read: (input, state, lang?: string): string[] => {
    if (state !== "filled") return [];
    const { at, count } = props.parse(input);
    return [stepLine(at, count, lang)];
  },
} as const satisfies Meta;

export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    style: z.enum(["dots", "bar", "numbered"]).default("dots"),
    count: z.int().min(2).max(6),
    at: z.int().min(1).max(6),
    label: text(32).optional(),
  })
  .refine(({ count, at }) => at <= count, { path: ["at"], message: "Must not exceed count" })
  .overwrite((value) => (value.detail === "brief" ? { ...value, label: undefined } : value));

export function fallback(_input: { cast: CastLike }): z.input<typeof props> {
  return { count: 3, at: 1 };
}

const reminderStep = { count: 4, at: 2, label: "Set a watering reminder" } as const;

export const examples = [
  { style: "dots", count: 3, at: 2, label: "Add your first plant" },
  { style: "numbered", count: 4, at: 3, label: "Confirm Clover's walk" },
  { style: "bar", count: 5, at: 1 },
  reminderStep,
  { ...reminderStep },
  { ...reminderStep, detail: "brief" },
] satisfies z.input<typeof props>[];

const { choose, write } = probesFor("Steps");
export const probes = [
  choose("I'm on the second screen of three while setting up my plant care app; show how far along I am"),
  choose(
    "Show today's plant jobs so I can tick off watering, misting and turning each pot independently",
    "Checklist",
  ),
  write(
    "I'm adding my first plant on the second screen of a three-screen setup; show my place and say Add your first plant",
  ),
  {
    ...write(
      "I'm on the second screen of four in plant setup. Show only my position in that sequence, not the task name Set a watering reminder.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
] satisfies Probe[];

export function Steps({ style, count, at, label }: Props<typeof props, typeof meta>) {
  const { lang } = useWords();
  const density = useKit().density;

  const position = stepLine(at, count, lang);
  return (
    <KitBlock label={label ? `${position} · ${label}` : position} density={density}>
      <KitContent density={density}>
        <KitStepsTrack style={style} count={count} at={at} part="track" />
        {label ? (
          <KitText role="body" tone="muted" part="label" density={density}>
            <KitText role="number" part={null} density={density}>
              {position}
            </KitText>
            {"\n"}
            {label}
          </KitText>
        ) : (
          <KitText role="number" part="label" density={density}>
            {position}
          </KitText>
        )}
      </KitContent>
    </KitBlock>
  );
}

import { z } from "zod";
import { probesFor, stepLine, text, type CastLike, type Meta, type Probe, type Props } from "../catalog";
import { KitBlock, KitContent, KitStepsTrack, KitText } from "../kit";

export const meta = {
  id: "Steps",
  group: "structure",
  purpose: "Know your current place in a short ordered flow.",
  pick: "Show the current position in a short setup or booking flow. Not independent jobs to tick off (Checklist) or progress toward a numeric goal (Ring).",
  region: "top",
  weight: 1,
  tier: "phone",
  realPath: "The current position in a flow stored in the on-device app.",
  parts: ["root", "track", "label"],
  states: ["filled"],
  read: (input, state) => {
    if (state !== "filled") return [];
    const { at, count } = props.parse(input);
    return [stepLine(at, count)];
  },
} as const satisfies Meta;

export const props = z
  .strictObject({
    style: z.enum(["dots", "bar", "numbered"]).default("dots"),
    count: z.int().min(2).max(6),
    at: z.int().min(1).max(6),
    label: text(32).optional(),
  })
  .refine(({ count, at }) => at <= count, { path: ["at"], message: "Must not exceed count" });

export function fallback(_input: { cast: CastLike }): z.input<typeof props> {
  return { count: 3, at: 1 };
}

export const examples = [
  { style: "dots", count: 3, at: 2, label: "Add your first plant" },
  { style: "numbered", count: 4, at: 3, label: "Confirm Clover's walk" },
  { style: "bar", count: 5, at: 1 },
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
] satisfies Probe[];

export function Steps({ style, count, at, label }: Props<typeof props, typeof meta>) {
  const position = stepLine(at, count);
  return (
    <KitBlock label={label ? `${position} · ${label}` : position}>
      <KitContent>
        <KitStepsTrack style={style} count={count} at={at} part="track" />
        <KitText role={label ? "body" : "caption"} tone={label ? "text" : "muted"} part="label">
          <KitText role="caption" tone="muted" part={null}>
            {position}
          </KitText>
          {label && (
            <>
              {"\n"}
              {label}
            </>
          )}
        </KitText>
      </KitContent>
    </KitBlock>
  );
}

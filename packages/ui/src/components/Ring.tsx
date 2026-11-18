import { z } from "zod";
import {
  probesFor,
  clip,
  goalLine,
  placeholderTitle,
  text,
  thingOf,
  type CastLike,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { KitCard, KitRing, KitSkeleton, KitText, useComponentState } from "../kit";

export const meta = {
  id: "Ring",
  signature: "ring_fill",
  group: "data",
  purpose: "How far you are toward one goal.",
  pick: "One amount completed toward a target. Not several targets at once (Progress), several summary numbers (Stats) or ordered stages of a process (Steps).",
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "A completed amount and its target derived from records in the on-device database.",
  parts: ["root", "ring", "value", "label", "sub"],
  states: ["filled", "loading"],
  read: (input, state) => {
    const { value, of } = props.parse(input);
    return state === "filled" ? [`${value} ${goalLine(of)}`] : [];
  },
} as const satisfies Meta;

export const props = z.strictObject({
  style: z.enum(["md", "lg"]).default("md"),
  value: z.number().min(0),
  of: z.number().positive(),
  label: text(24),
  sub: text(48).optional(),
});

export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  return {
    style: "md",
    value: 0,
    of: 1,
    label: clip(thingOf(cast)?.type.trim() || placeholderTitle(0), 24),
  };
}

export const examples = [
  { style: "md", value: 3, of: 5, label: "Watered today" },
  { style: "lg", value: 9, of: 12, label: "Walks this week", sub: "3 to go" },
] satisfies z.input<typeof props>[];

const { choose, write } = probesFor("Ring");
export const probes = [
  choose("Show three of the five plants I planned to water today as one amount completed out of the target"),
  choose("Show my total plants, the number watered today and the number due together", "Stats"),
  write("Show three of five plants watered today, labelled Watered today"),
] satisfies Probe[];

export function Ring({ style, value, of, label, sub }: Props<typeof props, typeof meta>) {
  const state = useComponentState();
  if (state === "loading") {
    return (
      <KitCard style="inset" part="root">
        <KitSkeleton shape="ring" ring={style} lead="none" />
      </KitCard>
    );
  }
  return (
    <KitCard style="inset" part="root" padded>
      <KitRing value={value} of={of} scale={style} part="ring">
        <KitText role="number" align="center" part="value">
          {value}
        </KitText>
        <KitText role="body" tone="muted" align="center" part={null}>
          {goalLine(of)}
        </KitText>
      </KitRing>
      <KitText role="heading" align="center" part="label">
        {label}
      </KitText>
      {sub && (
        <KitText role="body" tone="muted" align="center" part="sub">
          {sub}
        </KitText>
      )}
    </KitCard>
  );
}

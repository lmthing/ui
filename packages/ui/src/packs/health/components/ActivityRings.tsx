import { z } from "zod";
import {
  goalLine,
  placeholderValue,
  probesFor,
  text,
  type CastLike,
  type Meta,
  type Probe,
} from "../../../catalog";
import { seedTitles } from "..";

// Core first: Ring/default cannot show two or three independently filled concentric daily goals.
export const meta = {
  id: "ActivityRings",
  status: "draft",
  group: "data",
  purpose: "See two or three daily activity goals together.",
  pick: "Choose only for two or three simultaneous daily goals as concentric rings, each with its own value and target. Not one daily goal (Ring): even a step or exercise goal drawn as a circle remains Ring when it is the only goal. Not targets drawn as bars (Progress).",
  region: "body",
  weight: 2,
  tier: "phone",
  signature: "ring_fill",
  realPath: "Totals stored on the device; phone health-store or watch imports need read permission.",
  items: { key: "rings", parts: ["root", "label", "value", "of", "unit"] },
  parts: ["root"],
  states: ["filled", "loading"],
  read: (input, state) =>
    state !== "filled"
      ? []
      : (input as z.output<typeof props>).rings.map(
          (ring) => `${ring.label}: ${ring.value} ${goalLine(ring.of)} ${ring.unit}`,
        ),
} as const satisfies Meta;
export const props = z.strictObject({
  rings: z
    .array(
      z.strictObject({
        label: text(16),
        value: z.number().min(0).max(1000000),
        of: z.number().positive().max(1000000),
        unit: text(8),
      }),
    )
    .min(2)
    .max(3),
});
export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const titles = seedTitles(cast, 2, 16);
  return {
    rings: [0, 1].map((index) => ({
      label: titles[index % titles.length]!,
      value: 0,
      of: 1,
      unit: placeholderValue,
    })),
  };
}
export const examples = [
  {
    rings: [
      { label: "Move", value: 280, of: 400, unit: "kcal" },
      { label: "Exercise", value: 20, of: 30, unit: "min" },
      { label: "Stand", value: 7, of: 12, unit: "hours" },
    ],
  },
  {
    rings: [
      { label: "Steps", value: 8500, of: 8000, unit: "steps" },
      { label: "Water", value: 5, of: 8, unit: "glasses" },
    ],
  },
] satisfies z.input<typeof props>[];
const { choose, write } = probesFor("ActivityRings");
export const probes = [
  choose(
    "Show move, exercise and stand as three concentric daily rings, each with a separate value and goal",
  ),
  choose("Show just one circular daily step goal, 3000 of 8000, no other goals", "Ring"),
  write("Three daily goals: Move 280 of 400 kcal, Exercise 20 of 30 min, Stand 7 of 12 hours"),
] satisfies Probe[];

import { z } from "zod";
import {
  placeholderValue,
  probesFor,
  screenId,
  text,
  type CastLike,
  type Meta,
  type Probe,
} from "../../../catalog";
import { seedTitles } from "..";

// Core first: Sparkline/default cannot show a long measurement series with a goal line and range tabs.
export const meta = {
  id: "Measurements",
  status: "draft",
  group: "data",
  purpose: "Track one body measurement over weeks against a goal.",
  pick: "One body measurement over weeks with a dashed goal, latest value, change and month/quarter/year ranges. Not a short trend under one number (Sparkline), a holding's price (PriceChart), or business series (LineChart).",
  region: "body",
  weight: 2,
  tier: "phone",
  realPath:
    "Measurements typed on the device; a scale or health-store import needs read permission, and is not medical advice.",
  parts: ["root", "label", "latest", "change", "goal", "plot", "range", "add"],
  states: ["filled", "empty", "loading"],
  actions: { parts: { range: ["select"], add: ["press"] } },
  read: (input, state) => {
    const { points, unit, goal } = input as z.output<typeof props>;
    const latest = points[points.length - 1]!;
    return state !== "filled"
      ? []
      : [
          `${latest} ${unit}`,
          `${latest - points[0]!} ${unit}`,
          ...(goal === undefined ? [] : [`${goal} ${unit}`]),
        ];
  },
} as const satisfies Meta;
export const props = z.strictObject({
  label: text(20),
  unit: text(8),
  points: z.array(z.number().min(0).max(10000)).min(4).max(52),
  goal: z.number().min(0).max(10000).optional(),
  range: z.enum(["month", "quarter", "year"]).default("month"),
  goto: screenId,
});
export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  return {
    label: seedTitles(cast, 1, 20)[0]!,
    unit: placeholderValue,
    points: [0, 0, 0, 0],
    goto: "details",
  };
}
export const examples = [
  {
    label: "Body weight",
    unit: "kg",
    points: [78, 77.5, 77.2, 76.8],
    goal: 75,
    range: "month",
    goto: "add_measurement",
  },
  { label: "Waist", unit: "cm", points: [90, 89, 88.5, 88, 87.5], range: "quarter", goto: "add_measurement" },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("Measurements");
export const probes = [
  choose(
    "Track my body weight over twelve weeks with a dashed goal line, latest change and selectable month or year range",
  ),
  choose(
    "Show just today's weight and a tiny recent trend underneath, no goal line or range switching",
    "Sparkline",
  ),
  write(
    "Body weight in kg, four weekly readings 78, 77.5, 77.2, 76.8, goal 75, month range, add opens add_measurement",
  ),
  read("Add a new body-weight measurement", { address: "m1/add", action: "press" }),
] satisfies Probe[];

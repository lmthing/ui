import { z } from "zod";
import { probesFor, text, thingOf, type FallbackInput, type Meta, type Probe } from "../../../catalog";

const activities = ["run", "ride", "walk", "swim", "hike"] as const;

// Core first: Timer/up cannot show distance, average pace or per-distance splits.
export const meta = {
  id: "CardioSession",
  status: "draft",
  group: "data",
  purpose: "See endurance workout telemetry and compare individual splits.",
  pick: "Endurance workout telemetry with distance, elapsed time, pace and distance splits. Not a stopwatch alone (Timer), strength sets and reps (Workout), or place stops (Route).",
  region: "body",
  weight: 3,
  dense: true,
  tier: "ok",
  realPath:
    "GPS distance and heart rate need device permissions; session metrics can also be entered manually.",
  parts: [
    "root",
    "activity",
    "elapsed",
    "distance",
    "pace",
    "elevation",
    "heart",
    "zone",
    "start",
    "pause",
    "resume",
    "lap",
    "finish",
  ],
  items: { key: "splits", parts: ["root", "label", "amount", "elevation_delta"] },
  states: ["filled", "empty", "loading", "success", "error"],
  actions: {
    parts: { start: ["start"], pause: ["pause"], resume: ["play"], lap: ["press"], finish: ["stop"] },
  },
} as const satisfies Meta;

export const props = z.strictObject({
  activity: z.enum(activities),
  startedAt: z.iso.datetime({ offset: true }),
  elapsedSeconds: z.number().min(0),
  distance: z.number().min(0),
  unit: z.enum(["km", "mi"]),
  elevation: z.number().optional(),
  hrAvg: z.number().optional(),
  hrZone: z.int().min(1).max(5).optional(),
  splits: z
    .array(
      z.strictObject({
        label: text(8),
        seconds: z.number().positive(),
        elevationDelta: z.number().optional(),
      }),
    )
    .min(0)
    .max(30),
  live: z.boolean().default(false),
  style: z.enum(["summary", "live"]).default("summary"),
});

export function fallback({ cast }: FallbackInput): z.input<typeof props> {
  const activity = z.enum(activities).safeParse(thingOf(cast)?.type);
  return {
    activity: activity.data ?? "run",
    startedAt: "1970-01-01T00:00:00Z",
    elapsedSeconds: 0,
    distance: 0,
    unit: "km",
    splits: [],
  };
}

export const examples = [
  {
    activity: "run",
    startedAt: "2026-11-19T07:00:00-05:00",
    elapsedSeconds: 1550,
    distance: 5,
    unit: "km",
    elevation: 42,
    hrAvg: 151,
    hrZone: 3,
    splits: [
      { label: "Km 1", seconds: 326, elevationDelta: 21 },
      { label: "Km 2", seconds: 309, elevationDelta: 14 },
      { label: "Km 3", seconds: 313, elevationDelta: 7 },
      { label: "Km 4", seconds: 304, elevationDelta: -12 },
      { label: "Km 5", seconds: 298, elevationDelta: 0 },
    ],
  },
  {
    activity: "walk",
    startedAt: "2026-11-19T15:00:00+00:00",
    elapsedSeconds: 1740,
    distance: 1.8,
    unit: "mi",
    splits: [{ label: "Mile 1", seconds: 945 }],
    style: "live",
    live: true,
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("CardioSession");
export const probes = [
  choose("Show my run’s elapsed time, distance, and a pace bar for each kilometre split"),
  choose("Give me one stopwatch that counts up, with start and stop and nothing else", "Timer"),
  write(
    "Show a finished 2 km run started at 07:00 UTC on November 19, 2026. Elapsed time is 640 seconds, with kilometre splits of 330 and 310 seconds.",
  ),
  read("Pause the current workout clock", { address: "c1/pause", action: "pause" }, 1),
] satisfies Probe[];

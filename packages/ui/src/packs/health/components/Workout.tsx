import { z } from "zod";
import { probesFor, text, type CastLike, type Meta, type Probe } from "../../../catalog";
import { indexedActions, indexedParts, indexedValues, indexedWhen, seedTitles } from "..";

// Core first: Checklist/plain cannot edit weights and reps per set or attach a rest countdown.
export const meta = {
  id: "Workout",
  status: "draft",
  group: "input",
  purpose: "Log each exercise's sets, weight and reps during one workout.",
  pick: "Logging a workout set by set, editing weight and reps, ticking sets and resting between them. Not ordinary jobs to tick (Checklist), timing one activity (Timer), or a run on a route (Route).",
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "Exercise sets stored on the device; this is a log, not medical advice.",
  items: { key: "exercises", parts: ["root", "name", ...indexedParts(6, ["weight", "reps", "done"])] },
  parts: ["root", "time", "rest", "finish"],
  states: ["filled", "empty", "success"],
  actions: {
    parts: { rest: ["stop"], finish: ["press"] },
    items: indexedActions(6, { weight: ["type"], reps: ["type"], done: ["check"] }),
    when: indexedWhen(6, ["weight", "reps", "done"]),
  },
  read: (input, state) =>
    state !== "filled"
      ? []
      : (input as z.output<typeof props>).exercises.map(
          (exercise) =>
            `${exercise.name}: ${exercise.sets.map((set) => `${set.weight ?? 0}×${set.reps ?? 0}${set.seconds === undefined ? "" : ` / ${set.seconds}s`}${set.done ? " ✓" : ""}`).join(", ")}`,
        ),
} as const satisfies Meta;

export const props = z.strictObject({
  exercises: z
    .array(
      z
        .strictObject({
          name: text(28),
          sets: z
            .array(
              z.strictObject({
                weight: z.number().min(0).max(1000).optional(),
                reps: z.int().min(0).max(999).optional(),
                seconds: z.int().min(0).max(86400).optional(),
                done: z.boolean(),
              }),
            )
            .min(1)
            .max(6),
        })
        .overwrite((exercise) => ({
          ...exercise,
          ...indexedValues(
            exercise.sets.map((set) => ({
              weight: { value: set.weight },
              reps: { value: set.reps },
              done: { done: set.done },
            })),
            6,
            ["weight", "reps", "done"],
          ),
        })),
    )
    .min(1)
    .max(8),
  rest: z.int().min(0).max(600).default(90),
  unit: z.enum(["kg", "lb"]).default("kg"),
});
export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  return {
    exercises: seedTitles(cast, 2, 28).map((name) => ({ name, sets: [{ weight: 0, reps: 0, done: false }] })),
  };
}
export const examples = [
  {
    exercises: [
      {
        name: "Bench press",
        sets: [
          { weight: 40, reps: 8, done: false },
          { weight: 40, reps: 8, done: false },
        ],
      },
      { name: "Plank", sets: [{ seconds: 45, done: true }] },
    ],
    rest: 90,
    unit: "kg",
  },
  {
    exercises: [
      {
        name: "Goblet squat",
        sets: [
          { weight: 25, reps: 12, done: true },
          { weight: 25, reps: 10, done: false },
        ],
      },
    ],
    rest: 60,
    unit: "lb",
  },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("Workout");
export const probes = [
  choose("Log a strength session, entering the weight and reps for each set and ticking it before resting"),
  choose(
    "Tick off today's three jobs: stretch, walk and drink water, with no sets or numeric inputs",
    "Checklist",
  ),
  write("Log bench press, two sets of 40 kg for 8 reps, neither done, with 90 seconds rest"),
  read("Mark the first bench press set as done", { address: "w1/r1/done_1", action: "check" }),
  read("Change the second bench press set's weight", { address: "w1/r1/weight_2", action: "type" }),
] satisfies Probe[];

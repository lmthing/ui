import { expect, it } from "vitest";
import { workoutReading, workoutSetTimes } from "../../copy";

it("preserves optional blanks, real zeros, and localized numbers and times", () => {
  expect(workoutSetTimes({ done: false, seconds: 0, remaining: 0 })).toEqual([
    ["duration", "Duration · 0:00"],
  ]);
  expect(
    workoutReading(
      {
        exercises: [{ name: "Squat", sets: [{ done: true, weight: 42.5, reps: 0, remaining: 14 }] }],
        unit: "kg",
        rest: 90,
        elapsed: 65,
      },
      "de-DE",
    ),
  ).toEqual([
    "Elapsed time · 1:05",
    "Squat · Set 1 · Weight (kg) 42,5 · Reps 0 · Complete · Rest · 0:14",
    "Stop rest",
    "Finish workout",
  ]);
});

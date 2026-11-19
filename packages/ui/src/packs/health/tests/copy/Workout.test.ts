import { expect, it } from "vitest";
import { activeWorkoutRest, workoutReading, workoutSetTimes } from "../../copy";

it("selects one visible rest, preferring actual running state when available", () => {
  const exercises = [
    {
      id: "r1",
      sets: [
        { done: true, remaining: 4 },
        { done: false, remaining: 2 },
      ],
    },
  ];
  expect(activeWorkoutRest(exercises)).toEqual({ id: "r1", pos: 1 });
  expect(activeWorkoutRest(exercises, (_id, pos) => pos === 2)).toEqual({ id: "r1", pos: 2 });
  expect(activeWorkoutRest(exercises, () => false)).toBeUndefined();
});

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

import { describe, expect, it } from "vitest";
import { breathFrame, breathReading, breathSeconds } from "../../copy";

describe("breathFrame", () => {
  it.each([
    [0, "inhale", 0, 3],
    [2, "inhale", 0.5, 3],
    [4, "hold", 0, 3],
    [8, "exhale", 0, 3],
    [10, "exhale", 0.5, 3],
    [12, "rest", 0, 3],
    [16, "inhale", 0, 2],
    [47, "rest", 0.75, 1],
    [48, "rest", 0, 0],
    [60, "rest", 0, 0],
  ] as const)("maps elapsed box breathing at %is", (elapsed, phase, progress, roundsLeft) => {
    expect(breathFrame({ pattern: "box", rounds: 3 }, elapsed)).toEqual({ phase, progress, roundsLeft });
  });

  it("uses the documented calm and even durations", () => {
    const calm = { pattern: "calm", rounds: 2 } as const;
    expect(breathFrame(calm, 4).phase).toBe("hold");
    expect(breathFrame(calm, 11).phase).toBe("exhale");
    expect(breathFrame(calm, 19)).toEqual({ phase: "inhale", roundsLeft: 1, progress: 0 });
    const even = { pattern: "even", rounds: 2 } as const;
    expect(breathFrame(even, 5).phase).toBe("exhale");
    expect(breathFrame(even, 10)).toEqual({ phase: "inhale", roundsLeft: 1, progress: 0 });
  });

  it("skips zero-length custom phases, including the first and last", () => {
    const custom = { pattern: "custom", rounds: 2, inhale: 0, hold: 2, exhale: 6, rest: 0 } as const;
    expect(breathFrame(custom, -1)).toEqual({ phase: "hold", progress: 0, roundsLeft: 2 });
    expect(breathFrame(custom, 5)).toEqual({ phase: "exhale", progress: 0.5, roundsLeft: 2 });
    expect(breathFrame(custom, 8)).toEqual({ phase: "hold", progress: 0, roundsLeft: 1 });
    expect(breathFrame(custom, 16).roundsLeft).toBe(0);
  });
});

it.each([
  ["box", 16],
  ["calm", 19],
  ["even", 10],
] as const)("caps the %s clock after all rounds", (pattern, seconds) => {
  expect(breathSeconds({ pattern, rounds: 20 })).toBe(20 * seconds);
});

it("caps a custom clock using only the configured durations", () => {
  expect(breathSeconds({ pattern: "custom", rounds: 20, inhale: 0, hold: 4, exhale: 6, rest: 10 })).toBe(400);
});

it("uses localized numbers, singular/plural rounds and completion copy", () => {
  expect(breathReading({ phase: "inhale", progress: 0, roundsLeft: 1 }, "en")).toEqual([
    "Breathe in",
    "1 round left",
  ]);
  expect(breathReading({ phase: "hold", progress: 0, roundsLeft: 12 }, "ar-EG")).toEqual([
    "Hold",
    "١٢ rounds left",
  ]);
  expect(breathReading({ phase: "rest", progress: 0, roundsLeft: 0 }, "en")).toEqual([
    "Complete",
    "0 rounds left",
  ]);
});

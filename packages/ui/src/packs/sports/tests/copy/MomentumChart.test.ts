import { expect, it } from "vitest";
import { momentumExtent, momentumReading, momentumSummary, momentumTimes, selectedEvent } from "../../copy";

it("uses each scale's neutral midpoint and derives the signed advantage", () => {
  expect(momentumSummary("win_prob", 77.5)).toEqual({ baseline: 50, delta: 27.5, side: "home" });
  expect(momentumSummary("win_prob", 50)).toEqual({ baseline: 50, delta: 0, side: "even" });
  expect(momentumSummary("momentum", -35)).toEqual({ baseline: 0, delta: -35, side: "away" });
  expect(momentumExtent("win_prob", [{ value: 50 }, { value: 18 }, { value: 60 }])).toBe(32);
  expect(momentumExtent("momentum", [{ value: -100 }, { value: 65 }])).toBe(100);
});

it("localizes a selected clock reading and the latest advantage", () => {
  const point = { id: "r2", ref: "away_goal", clock: "55′", value: 42.5, event: "Away goal" };
  expect(
    momentumReading(
      {
        home: "Lions",
        away: "Fern",
        mode: "win_prob",
        points: [point],
        samples: [point],
      },
      "de",
    ),
  ).toEqual([
    "Win probability",
    "55′ · 42,5 % · Fern +7,5 pp",
    "Selected event: r2",
    "r2: 55′ · 42,5 % · Away goal",
  ]);
});

it("uses numeric match time, but keeps feed order for opaque or repeating clocks", () => {
  const points = (...clocks: string[]) => clocks.map((clock) => ({ clock }));
  expect(momentumTimes(points("0′", "24′", "45+2′", "80'"))).toEqual([0, 24, 47, 80]);
  expect(momentumTimes(points("Q1 10:00", "Q1 05:30", "Q2 09:38"))).toEqual([0, 1, 2]);
  expect(momentumTimes(points("0′", "47′", "47′"))).toEqual([0, 1, 2]);
});

it("only selects events and falls back to the latest event if the selection no longer exists", () => {
  const first = { ref: "one", clock: "10′", value: 58, event: "First goal", selected: true };
  const second = { ref: "two", clock: "12′", value: 60, event: "Second goal" };
  const point = { ref: "three", clock: "15′", value: 55, selected: true };
  expect(selectedEvent([first, second, point])).toBe(first);
  expect(selectedEvent([{ ...first, selected: false }, second, point])).toBe(second);
  expect(selectedEvent([point])).toBeUndefined();
});

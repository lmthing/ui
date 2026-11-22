import { expect, it } from "vitest";
import { momentumReading, momentumSummary } from "../../copy";

it("uses each scale's neutral midpoint and derives the signed advantage", () => {
  expect(momentumSummary("win_prob", 77.5)).toEqual({ baseline: 50, delta: 27.5, side: "home" });
  expect(momentumSummary("win_prob", 50)).toEqual({ baseline: 50, delta: 0, side: "even" });
  expect(momentumSummary("momentum", -35)).toEqual({ baseline: 0, delta: -35, side: "away" });
});

it("localizes a selected clock reading and the latest advantage", () => {
  const point = { id: "r2", clock: "55′", value: 42.5, event: "Away goal" };
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
  ).toEqual(["Win probability", "55′ · 42,5 % · Fern +7,5 pp", "r2: 55′ · 42,5 % · Away goal"]);
});

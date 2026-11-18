import { expect, it } from "vitest";
import {
  clockLine,
  durationLine,
  leftLine,
  remainingLine,
  repeatLabels,
  repeatOptions,
  streakLine,
} from "./time";

it("formats stored durations at the booking bounds", () => {
  expect([5, 30, 60, 600].map(durationLine)).toEqual(["5 min", "30 min", "60 min", "600 min"]);
});

it("keeps clock, countdown and streak text unchanged at boundaries", () => {
  expect([clockLine(-1), clockLine(59.9), clockLine(60), clockLine(3723)]).toEqual([
    "0:00",
    "0:59",
    "1:00",
    "1:02:03",
  ]);
  expect(remainingLine(245)).toBe("-4:05");
  expect([leftLine(0), leftLine(1), leftLine(60000), leftLine(3600000), leftLine(86400000)]).toEqual([
    "Passed",
    "1 min left",
    "1 min left",
    "1 h left",
    "1 day left",
  ]);
  expect(streakLine(1, [])).toEqual(["1 day", "none done this week"]);
  expect(streakLine(12, [true, true, true])).toEqual(["12 days", "done Mon, Tue, Wed"]);
  expect(repeatOptions.map((option) => repeatLabels[option])).toEqual([
    "Never",
    "Daily",
    "Weekdays",
    "Weekly",
    "Monthly",
    "Yearly",
  ]);
});

import { expect, it } from "vitest";
import {
  clockLine,
  leftLine,
  remainingLine,
  repeatLabels,
  repeatOptions,
  streakLine,
  slotDurationLine,
  slotDetailLine,
  slotEndLine,
  slotLabels,
  slotLoadingLine,
} from "./time";

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

it("formats exact slot durations and local end times at the supported boundaries", () => {
  expect([slotDurationLine(5), slotDurationLine(30), slotDurationLine(600)]).toEqual([
    "5 min",
    "30 min",
    "600 min",
  ]);
  expect([
    slotEndLine("00:00", 5),
    slotEndLine("09:30", 30),
    slotEndLine("14:00", 60),
    slotEndLine("23:55", 5),
    slotEndLine("23:59", 600),
  ]).toEqual(["→ 00:05", "→ 10:00", "→ 15:00", "→ 00:00 +1d", "→ 09:59 +1d"]);
  expect(slotLabels).toEqual({ free: "free", taken: "taken", empty: "No free times" });
});

it("shares visible slot subtitles and geometry-only loading text with the reading", () => {
  expect([
    slotDetailLine("09:00", 30, "grid", false),
    slotDetailLine("09:00", 30, "grid", true),
    slotDetailLine("09:00", 30, "list", false),
    slotDetailLine("23:59", 600, "list", true),
  ]).toEqual(["free", "taken", "→ 09:30", "→ 09:59 +1d · taken"]);
  for (const line of ["", "09:00", "free", "→ 09:59 +1d · taken"]) {
    expect(slotLoadingLine(line)).toHaveLength(line.length);
    expect(slotLoadingLine(line).trim()).toBe("");
  }
});

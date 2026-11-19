import { expect, it } from "vitest";
import {
  appointmentDate,
  clockLine,
  durationLine,
  leftLine,
  remainingLine,
  repeatLabels,
  repeatOptions,
  streakLine,
  weekdayNames,
} from "./time";

it("formats stored durations at the booking bounds", () => {
  expect([5, 30, 60, 600].map((minutes) => durationLine(minutes))).toEqual([
    "5 min",
    "30 min",
    "60 min",
    "600 min",
  ]);
});

it("names every weekday and keeps working-week copy neutral", () => {
  expect(weekdayNames).toEqual([
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ]);
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

it("formats the full provider date without a timezone shift", () => {
  expect(appointmentDate("2026-11-20")).toBe("20 Nov 2026");
  expect(appointmentDate("2024-02-29")).toBe("29 Feb 2024");
  expect(appointmentDate("9999-12-31")).toBe("31 Dec 9999");
});

import { expect, it } from "vitest";
import {
  appointmentDate,
  availabilityDefaults,
  availabilityLabels,
  breakLine,
  clockLine,
  durationLine,
  leftLine,
  minutesLine,
  remainingLine,
  repeatLabels,
  repeatOptions,
  streakLine,
  sinceLine,
  slotDurationLine,
  slotDetailLine,
  slotEndLine,
  slotLabels,
  slotLoadingLine,
  weekdayNames,
} from "./time";

it("formats joining dates without device time zone shifts, including leap days", () => {
  expect(sinceLine("2025-04-03")).toBe("Client since 3 Apr 2025");
  expect(sinceLine("2024-02-29")).toBe("Client since 29 Feb 2024");
  expect(sinceLine("2025-01-01")).toBe("Client since 1 Jan 2025");
});

it("formats stored durations at the booking bounds", () => {
  expect([5, 30, 60, 600].map(durationLine)).toEqual(["5 min", "30 min", "60 min", "600 min"]);
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
  expect(availabilityDefaults).toEqual({ from: "09:00", to: "17:00" });
  expect(availabilityLabels).toEqual({ from: "From", to: "To", break: "Break" });
  expect(breakLine("00:00", "23:59")).toBe("Break 00:00–23:59");
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

it("formats the full provider date and bounded duration without a timezone shift", () => {
  expect(appointmentDate("2026-11-20")).toBe("20 Nov 2026");
  expect(appointmentDate("2024-02-29")).toBe("29 Feb 2024");
  expect(appointmentDate("9999-12-31")).toBe("31 Dec 9999");
  expect([minutesLine(5), minutesLine(600)]).toEqual(["5 min", "600 min"]);
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

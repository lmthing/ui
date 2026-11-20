import { expect, it } from "vitest";
import { eventCopy, eventReading } from "../../copy";

const input = {
  date: "2026-11-28",
  time: "14:00",
  going: 12345,
  status: "none" as const,
  attendees: ["Maya", "Sam"],
};

it("formats independent day, short month, time, and exact count in the app locale", () => {
  expect(eventCopy(input)).toEqual({ day: "28", month: "Nov", time: "14:00", count: "12345 going" });
  expect(eventCopy(input, "ar-EG")).toEqual({
    day: "٢٨",
    month: "نوفمبر",
    time: "١٤:٠٠",
    count: "١٢٣٤٥ going",
  });
});

it("reads the names in order and preserves zero counts without names, but suppresses loading content", () => {
  expect(eventReading(input, "filled")).toEqual([
    "28 Nov 2026",
    "14:00",
    "12345",
    "12345 going",
    "Maya",
    "Sam",
    "Going",
    "Interested",
  ]);
  expect(eventReading({ ...input, going: 0, attendees: undefined }, "filled")).toContain("0 going");
  expect(eventReading({ ...input, status: "interested" }, "filled")).toContain("You’re interested");
  expect(eventReading(input, "loading")).toEqual([]);
});

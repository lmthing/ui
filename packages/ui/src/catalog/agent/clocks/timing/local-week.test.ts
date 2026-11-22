import { expect, it } from "vitest";
import { inLocalWeek } from "./timestamp";

it("uses local Monday boundaries across a daylight-saving transition", () => {
  const week = "2026-03-02";
  const start = Date.parse("2026-03-02T05:00:00Z");
  const end = Date.parse("2026-03-09T04:00:00Z");
  const zone = "America/New_York";
  expect(inLocalWeek(start, end, week, zone)).toBe(true);
  expect(inLocalWeek(start - 1, end, week, zone)).toBe(false);
  expect(inLocalWeek(start, end + 1, week, zone)).toBe(false);
  expect(inLocalWeek(start, end, "2026-03-03", zone)).toBe(false);
  expect(inLocalWeek(start, end, week, "not_a_zone")).toBe(false);
});

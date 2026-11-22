import { expect, it } from "vitest";
import { rosterCounts, rosterDate, rosterInitials, rosterSummary } from "../../copy";

it("formats offset-local date and time and localizes the summary", () => {
  const at = "2026-11-21T23:45:00-05:00";
  expect(rosterDate(at, "en-GB")).toBe("21 Nov 2026 · 23:45");
  expect(rosterSummary(1, 1, 0, "en-GB")).toEqual({
    attendance: "1 checked in",
    spaces: "1 spot left",
    waiting: "0 waiting",
  });
  expect(rosterSummary(2, 0)).toMatchObject({ attendance: "2 checked in", spaces: "0 spots left" });
});

it("counts bookings and arrivals as occupied, frees no-shows and clamps overbooking", () => {
  const rows = [{ status: "booked" }, { status: "checked_in" }, { status: "no_show" }] as const;
  expect(rosterCounts(3, rows)).toEqual({ checkedIn: 1, spaces: 1, canAdmit: true });
  expect(rosterCounts(2, [rows[0], rows[0], rows[1]])).toEqual({
    checkedIn: 1,
    spaces: 0,
    canAdmit: false,
  });
});

it("takes one character from each of the first two names", () => {
  expect(rosterInitials("Jules Rivera III")).toBe("JR");
  expect(rosterInitials("魯米")).toBe("魯");
});

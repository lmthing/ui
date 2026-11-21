import { describe, expect, it } from "vitest";
import { rosterDays, rosterReading, rosterShift, rosterToday, rosterWeek, shiftsByPerson } from "../../copy";

const monday = { person: 0, day: 0, from: "07:30", to: "13:15", role: "Front\n desk" };
const sunday = { person: 0, day: 6, from: "14:00", to: "19:00" };

describe("Roster copy", () => {
  it("flags only days without shifts and returns a Monday-first week", () => {
    const days = rosterDays([sunday, monday, monday]);
    expect(days.map((day) => day.short)).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
    expect(days.filter((day) => !day.uncovered).map((day) => day.id)).toEqual(["0", "6"]);
    expect(rosterDays([]).every((day) => day.uncovered)).toBe(true);
  });
  it("highlights only local dates within the Monday-to-Sunday interval, including across years", () => {
    const week = "2026-12-28";
    expect(rosterToday(week, new Date(2026, 11, 27, 23, 59))).toBeUndefined();
    expect(rosterToday(week, new Date(2026, 11, 28, 0))).toBe("0");
    expect(rosterToday(week, new Date(2027, 0, 3, 23, 59))).toBe("6");
    expect(rosterToday(week, new Date(2027, 0, 4, 0))).toBeUndefined();
  });
  it("groups and sorts without rewriting shift ids or dropping staff with no shifts", () => {
    const people = [{ name: "Anna\nLee" }, { name: "Rae" }];
    const shifts = [sunday, { ...monday, from: "09:30" }, monday];
    expect(shiftsByPerson(people, shifts).map((row) => row.map(({ index }) => index))).toEqual([
      [2, 1, 0],
      [],
    ]);
    expect(rosterReading({ week: "2026-11-16", people, shifts }, "filled")[0]?.split("\n")).toEqual([
      "Week of 16 Nov 2026",
      "Staff · Mon, Tue, Wed, Thu, Fri, Sat, Sun",
      "Anna Lee: Mon 07:30–13:15 Front  desk (r3), Mon 09:30–13:15 Front  desk (r2), Sun 14:00–19:00 (r1)",
      "Rae",
      "No cover: Tue, Wed, Thu, Fri, Sat",
      "Scroll sideways for all seven days",
    ]);
  });
  it("localizes date and time formatting and hides roles only in brief copy", () => {
    expect(rosterWeek("2026-11-16", "de-DE")).toContain("16. Nov. 2026");
    expect(rosterShift(monday, false, "ar-EG").time).toBe("٠٧:٣٠–١٣:١٥");
    expect(rosterShift(monday, true).role).toBeUndefined();
  });
});

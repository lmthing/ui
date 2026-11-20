import { describe, expect, it } from "vitest";
import { currentPeriod, readTimetable, timetableDays } from "../../copy";

const rows = [
  { id: "r1", day: "fri", time: "13:00", subject: "Biology" },
  { id: "r2", day: "mon", time: "10:00", subject: "Art", teacher: "Ms Rao" },
  { id: "r3", day: "mon", time: "08:30", subject: "Math", room: "B12" },
] as const;
const monday = (hour: number, minute = 0) => new Date(2026, 10, 16, hour, minute);

describe("timetable copy", () => {
  it("sorts by start time without changing the period addresses", () => {
    expect(timetableDays(rows, undefined, new Date(2026, 10, 20))).toEqual([
      { day: "fri", rows: [rows[0]] },
      { day: "mon", rows: [rows[2], rows[1]] },
    ]);
    expect(timetableDays(rows, "fri", monday(10))[0]?.day).toBe("fri");
    expect(timetableDays(rows, "sat", new Date(2026, 10, 22))[0]?.day).toBe("mon");
  });
  it("marks the latest started period on the local weekday only", () => {
    expect(currentPeriod(rows, monday(8, 29))).toBeUndefined();
    expect(currentPeriod(rows, monday(8, 30))?.id).toBe("r3");
    expect(currentPeriod(rows, monday(9, 59))?.id).toBe("r3");
    expect(currentPeriod(rows, monday(10))?.id).toBe("r2");
    expect(currentPeriod(rows, new Date(2026, 10, 17, 10))).toBeUndefined();
  });
  it("formats time in the given language and omits only room and teacher in brief", () => {
    expect(readTimetable(rows, "mon", "brief", "ar-EG-u-nu-arab")).toEqual([
      "Monday · mon",
      "r3: ٠٨:٣٠ · Math",
      "r2: ١٠:٠٠ · Art",
      "Friday · fri",
      "r1: ١٣:٠٠ · Biology",
    ]);
    expect(readTimetable(rows, "mon", "full", "en")).toContain("r3: 08:30 · Math · B12");
  });
});

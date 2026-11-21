import { describe, expect, it } from "vitest";
import { numberLine, wordsFor } from "@lmthing/ui/catalog";
import { timesheetReading, timesheetRow } from "../../copy";

describe("Timesheet computed hours and reading", () => {
  it.each([
    [[0, 0, 0, 0, 0, 0, 0], "0 h", undefined],
    [[8, 8, 8, 8, 8, 0, 0], "40 h", undefined],
    [[8, 8, 8, 8, 7.5, 4, 0], "43.5 h", "3.5 h"],
    [[24, 24, 24, 24, 24, 24, 24], "168 h", "128 h"],
    [[0.1, 0.2, 0, 0, 0, 0, 0], "0.3 h", undefined],
  ])("computes %j without floating-point display artifacts", (hours, total, overtime) => {
    expect(timesheetRow(hours)).toMatchObject({ total, overtime });
  });
  it("localizes numbers and weekday lookups consistently in display and reading", () => {
    const lang = "ar";
    const hours = [8, 8, 8, 8, 7.5, 4, 0];
    const { days, total, overtime } = timesheetRow(hours, lang);
    expect(days[4]).toBe(numberLine(7.5, lang));
    expect(total).toBe(`${numberLine(43.5, lang)} h`);
    const reading = timesheetReading({ rows: [{ name: "Anna", hours, approved: true }] }, "filled", lang);
    expect(reading[0]).toBe("Hours");
    expect(reading[1]).toContain(`${wordsFor(lang).weekdayShort[4]} ${days[4]}`);
    expect(reading[1]).toContain(`Total ${total} · Overtime ${overtime} · Status Approved`);
  });
});

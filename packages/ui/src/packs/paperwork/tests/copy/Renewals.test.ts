import { describe, expect, it } from "vitest";
import { actionDate, renewalDetails } from "../../copy";

describe("renewal copy", () => {
  const row = { due: "2027-01-01", noticeBy: "2026-11-21", complete: false };
  it("uses the notice date for warnings without replacing the end date", () => {
    expect(actionDate(row)).toBe(row.noticeBy);
    expect(renewalDetails(row, new Date(2026, 10, 21), "en")).toEqual([
      { part: "notice_by", line: "Notice by 21 Nov 2026", tone: "muted" },
      { part: "due", line: "Ends 1 Jan 2027", tone: "muted" },
      { part: "warning", line: "Action due today", tone: "warn" },
    ]);
    expect(renewalDetails(row, new Date(2026, 10, 22), "en").at(-1)?.line).toBe("Overdue");
  });
  it("shows an actual completion date instead of a warning", () => {
    const lines = renewalDetails(
      { ...row, complete: true, completedOn: "2026-11-20" },
      new Date(2026, 10, 22),
      "en",
    );
    expect(lines.at(-1)?.line).toBe("Completed 20 Nov 2026");
    expect(lines.some(({ part }) => part === "warning")).toBe(false);
  });
});

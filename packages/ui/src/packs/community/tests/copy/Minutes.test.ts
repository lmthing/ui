import { describe, expect, it } from "vitest";
import { minutesHeader, minutesRowCopy } from "../../copy";

describe("Minutes copy", () => {
  it("keeps the approved instant stable and formats the meeting date in the app language", () => {
    const input = {
      chairId: "ana",
      date: "2026-11-18",
      approvedBy: "ana",
      approvedAt: "2026-11-19T01:00:00+03:00",
    };
    expect(minutesHeader(input)).toEqual({
      date: "18 Nov 2026",
      chair: "Chair: Ana",
      approval: "Approved by Ana · 18 Nov 2026",
    });
    expect(minutesHeader(input, "en-US").date).toBe("Nov 18, 2026");
    expect(minutesHeader({ chairId: "ana", date: input.date }).approval).toBe("Awaiting approval");
  });
  it("labels overdue unfinished work without changing its decision owner or date", () => {
    const row = {
      id: "r2",
      kind: "action",
      visible: true,
      text: "Send reminder",
      decisionId: "d",
      decisionTitle: "Confirm dates",
      ownerId: "lee",
      due: "2026-11-18",
      done: false,
      can_check: false,
      overdue: true,
    } as const;
    expect(minutesRowCopy(row)).toMatchObject({
      title: "Send reminder",
      decision: "Confirm dates",
      owner: "Owner: Lee",
      due: "Overdue · 18 Nov 2026",
      status: "Open",
    });
    expect(minutesRowCopy({ ...row, done: true, overdue: false })).toMatchObject({
      due: "Due 18 Nov 2026",
      status: "Complete",
    });
  });
});

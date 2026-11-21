import { describe, expect, it } from "vitest";
import { orderedRequests, queueCounts, queueSnapshot, requestLines, type QueueRecord } from "../../copy";

const request: QueueRecord = {
  number: "R-1",
  title: "Loose shelf",
  opened: "2026-11-18",
  openedAt: "10:00",
  status: "working",
  urgency: "urgent",
};
const at = (local: string) => new Date(local).getTime();

describe("request display values", () => {
  it("honours an explicit time and gives date-only deadlines the full day", () => {
    const untimed = { ...request, due: "2026-11-19" };
    const timed = { ...untimed, dueAt: "10:00" };
    expect(requestLines(timed, at("2026-11-19T10:00")).overdue).toBe(false);
    expect(requestLines(timed, at("2026-11-19T10:01")).due).toContain("Overdue");
    expect(requestLines(untimed, at("2026-11-19T23:59")).overdue).toBe(false);
    expect(requestLines(untimed, at("2026-11-20T00:00")).overdue).toBe(true);
    expect(requestLines({ ...timed, status: "resolved" }, at("2026-11-20T00:00")).overdue).toBe(false);
    expect(requestLines(request, at("2026-11-20T00:00")).due).toBeUndefined();
  });

  it("derives localized elapsed age, assignee and deadline", () => {
    expect(requestLines(request, at("2026-11-18T09:59")).age).toBe("Just opened");
    expect(requestLines(request, at("2026-11-18T10:01")).age).toBe("1 minute old");
    expect(requestLines(request, at("2026-11-18T12:00")).age).toBe("2 hours old");
    expect(requestLines(request, at("2026-11-20T10:00"), "ar-u-nu-arab").age).toBe("٢ days old");
    expect(requestLines({ ...request, who: "Jo", due: "2026-11-21" }, at("2026-11-20T10:00"))).toMatchObject({
      who: "Assigned to Jo",
      due: "Due 21 Nov 2026",
    });
  });

  it("sorts by status when grouped, then by urgency and deadline, preserving ties and IDs", () => {
    const rows = [
      { ...request, id: "r1", due: "2026-11-20" },
      { ...request, id: "r2", status: "new", urgency: "low" },
      { ...request, id: "r3", due: "2026-11-20", dueAt: "23:59" },
      { ...request, id: "r4" },
      { ...request, id: "r5" },
    ] as const;
    expect(orderedRequests(rows, true).map(({ id }) => id)).toEqual(["r2", "r3", "r1", "r4", "r5"]);
    expect(orderedRequests(rows, false).map(({ id }) => id)).toEqual(["r3", "r1", "r4", "r5", "r2"]);
  });

  it("uses only host counts for the selected view and rejects malformed values", () => {
    const now = at("2026-11-19T11:00");
    const data = { requestQueue: [{ now, overflow: { active: 2, completed: 4 } }] };
    expect(queueSnapshot(data, "active")).toEqual({ now, more: 2 });
    expect(queueSnapshot(data, "completed")).toEqual({ now, more: 4 });
    for (const count of [-1, 0, Infinity, NaN, 1.5, "4"]) {
      expect(queueSnapshot({ requestQueue: [{ overflow: { active: count } }] }, "active").more).toBe(0);
    }
    expect(queueCounts(1, 0)).toEqual({ count: "1 request", more: undefined });
    expect(queueCounts(6, 2)).toEqual({ count: "8 requests", more: "and 2 more" });
  });
});

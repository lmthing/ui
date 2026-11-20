import { describe, expect, it } from "vitest";
import { threadEntryCopy, threadOrder } from "../../copy";

const event = {
  id: "r3",
  kind: "status",
  by: "Kai",
  date: "2026-11-20",
  time: "09:15",
  audience: "requester",
  from: "working",
  to: "resolved",
} as const;

describe("thread display copy", () => {
  it("formats the stored date and local time without shifting the zone", () => {
    expect(threadEntryCopy(event, "full", "en-US")).toMatchObject({ date: "Nov 20, 2026", time: "09:15" });
    expect(threadEntryCopy(event, "full", "en-GB")).toMatchObject({ date: "20 Nov 2026", time: "09:15" });
  });
  it("keeps the event and audience in brief mode but omits its detail", () => {
    expect(threadEntryCopy(event, "full").fact).toBe("In progress → Resolved");
    expect(threadEntryCopy(event, "brief")).toMatchObject({
      event: "Status changed",
      audience: "To requester",
      fact: undefined,
    });
  });
  it("orders by date and time, retaining tied row order and IDs", () => {
    const rows = [
      event,
      { ...event, id: "r4" },
      { ...event, id: "r2", time: "09:00" },
      { ...event, id: "r1", date: "2026-11-19" },
    ];
    expect(threadOrder(rows).map(({ id }) => id)).toEqual(["r1", "r2", "r3", "r4"]);
    expect(rows[0]?.id).toBe("r3");
  });
});

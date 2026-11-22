import { describe, expect, it } from "vitest";
import { threadEntryCopy, threadOrder, threadRead } from "../../copy";

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
  it("keeps the status transition as one line in brief mode", () => {
    expect(threadEntryCopy(event, "full").fact).toBe("In progress → Resolved");
    expect(threadEntryCopy(event, "brief")).toMatchObject({
      event: "In progress → Resolved",
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
  it("reads the composer but not hidden events in the empty state", () => {
    const input = {
      number: "TR-06",
      detail: "full",
      entries: [event],
      draft: "Checking the latch.",
      audience_choices: ["requester", "internal"],
      canBrowseReplies: true,
    };
    expect(threadRead(input, "empty")).toEqual([
      "Request TR-06",
      "Who can see this?",
      "To requester",
      "Keep internal",
      "Checking the latch.",
      "Browse saved replies",
      "Send reply",
    ]);
    expect(threadRead({ ...input, draft: undefined }, "empty")).toContain("Write a reply");
  });
});

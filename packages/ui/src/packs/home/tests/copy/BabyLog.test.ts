import { describe, expect, it } from "vitest";
import {
  babyClock,
  babyEmptyLog,
  babyEntryLine,
  babyLabels,
  babyLastLine,
  babyRead,
  babyRunningLine,
} from "../../copy";

describe("BabyLog copy", () => {
  it("keeps every baby-entry kind and idle label unchanged", () => {
    expect(babyLabels).toEqual({
      feed_left: "Feed left",
      feed_right: "Feed right",
      bottle: "Bottle",
      nappy: "Nappy",
      sleep: "Sleep",
      none: "None running",
    });
  });
  it("shares timer and recent-entry wording with the reader", () => {
    expect(babyRunningLine("none")).toBe("None running");
    expect(babyRunningLine("feed_right")).toBe("Feed right running");
    expect(babyClock).toBe("0:00");
    expect(babyLastLine("07:30")).toBe("Last 07:30");
    expect(
      babyRead({
        running: "feed_right",
        entries: [{ id: "r2", kind: "feed_right", entryKind: "tile", active: true, last: "07:30" }],
      }),
    ).toEqual([
      "Feed right running",
      "0:00",
      "r2 Feed right · Stop · Last 07:30",
      "Today’s log",
      babyEmptyLog,
    ]);
  });
  it("keeps zero minutes and includes optional amounts only when set", () => {
    expect(
      babyEntryLine({ kind: "bottle", time: "09:05", entryKind: "log", minutes: 0, amount: "90 ml" }),
    ).toBe("Bottle · 09:05 · 0 min · 90 ml");
    expect(babyEntryLine({ kind: "sleep", time: "09:05", entryKind: "log" })).toBe("Sleep · 09:05");
  });
});

import { expect, it } from "vitest";
import { choreIsDone, choreLines } from "../../copy";

const chore = { title: "Mist the fern", who: "Sam", repeat: "monthly", every: 1 } as const;

it("derives completion and due dates from the most recent logged completion", () => {
  const previous = { ...chore, last: "2026-01-31" };
  const completed = { ...chore, last: "2026-03-02" };
  expect(choreLines(previous, "2026-03-02")).toMatchObject({
    done: false,
    last: "Last 31\u00a0Jan\u00a026",
    next: "Late 28\u00a0Feb\u00a026",
    tone: "bad",
  });
  expect(choreLines(completed, "2026-03-02")).toMatchObject({
    done: true,
    next: "Next 2\u00a0Apr\u00a026",
  });
  expect(choreIsDone(completed, "2026-04-02")).toBe(false);
});

it("handles a first completion and never reopens a completed nonrepeating chore", () => {
  expect(choreLines(chore, "2026-11-19")).toMatchObject({ done: false, next: "Due today" });
  const once = { ...chore, repeat: "never" } as const;
  expect(choreLines(once, "2026-11-19")).toMatchObject({ done: false, next: "Ready to do" });
  expect(choreLines({ ...once, last: "2026-01-01" }, "2026-11-19")).toMatchObject({
    done: true,
    next: "No next date",
  });
});

it("localizes numbers and initials without changing authored names or dates", () => {
  expect(choreLines({ ...chore, points: 0 }).points).toEqual({ count: "0", suffix: " points" });
  expect(choreLines({ ...chore, points: 1 }).points).toEqual({ count: "1", suffix: " point" });
  const row = { ...chore, who: "ipek", points: 1.5, last: "2026-11-18" };
  expect(choreLines(row, "2026-11-19", "tr")).toMatchObject({
    initials: "İ",
    label: "Mist the fern · ipek · Done for now",
    points: { count: "1,5", suffix: " points" },
    last: "Last 18\u00a0Kas\u00a026",
  });
});

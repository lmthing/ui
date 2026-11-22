import { expect, it } from "vitest";
import { badgeCriterionRuns, badgeMilestone, readBadgeMilestones } from "../../copy";

const earned = { earned: "2026-10-04", how: "Old criterion" };
const locked = { how: "Finish the practice" };

it("formats the earned date in the requested locale without changing its day", () => {
  expect(badgeMilestone(earned)).toEqual({ part: "earned", text: "4 Oct 2026" });
  expect(badgeMilestone(earned, "en-US")).toEqual({ part: "earned", text: "Oct 4, 2026" });
});

it("uses the authored criterion or a neutral lock label", () => {
  expect(badgeMilestone(locked)).toEqual({ part: "how", text: locked.how });
  expect(badgeMilestone({})).toEqual({ part: "how", text: "Locked" });
});

it("supplements the generic reader without repeating authored criteria", () => {
  expect(readBadgeMilestones([earned, locked, {}], "en-US")).toEqual(["r1: Oct 4, 2026", "r3: Locked"]);
});

it("emphasizes standalone score targets without changing authored criteria", () => {
  const text = "Score 5/5 or ٤/٤ by 11/22/2026.";
  const runs = badgeCriterionRuns(text);
  expect(runs.map((run) => run.text).join("")).toBe(text);
  expect(runs.filter((run) => run.target).map((run) => run.text)).toEqual(["5/5", "٤/٤"]);
  expect(badgeCriterionRuns("Complete the practice.")).toEqual([
    { text: "Complete the practice.", target: false },
  ]);
});

import { describe, expect, it } from "vitest";
import { challengeCopy } from "../../copy";

const goal = {
  goal: 10,
  total: 9,
  mine: 2,
  ends: "2028-03-01",
  unit: "km",
  joined: true,
  detail: "full",
  top: [{ name: "Maya", value: 2 }],
} as const;

describe("Challenge copy", () => {
  it.each([
    ["2028-02-28T23:59:59Z", "2 days left"],
    ["2028-02-29T00:00:00Z", "1 day left"],
    ["2028-03-01T23:59:59Z", "Ends today"],
    ["2028-03-02T00:00:00Z", "Challenge ended"],
  ])("formats a date-only countdown at %s", (now, daysLeft) => {
    expect(challengeCopy(goal, "filled", "en", Date.parse(now))).toMatchObject({
      ends: "Deadline: 1 Mar 2028",
      daysLeft,
    });
  });

  it("formats progress, contributions, ranking values and dates with the requested locale", () => {
    expect(challengeCopy({ ...goal, total: 12.5, mine: 2.3 }, "filled", "de-DE")).toMatchObject({
      progress: "12,5 of 10 km",
      total: "12,5 km",
      mine: "Your contribution: 2,3 km",
      ends: "Deadline: 1. März 2028",
      leaders: [{ label: "Maya, 2 km", score: "2 km" }],
      reached: true,
    });
  });
});

import { expect, it } from "vitest";
import { creditScoreCopy, creditScoreReading, creditScoreZones } from "../../copy";

const report = { score: 752, previousScore: 734, bureau: "Report", updatedAt: "2026-11-19", factors: [] };

it("covers every score with contiguous zones and uses the new tier at each threshold", () => {
  expect(creditScoreZones().map(({ label, from, to }) => [label, from, to])).toEqual([
    ["Poor", 300, 580],
    ["Fair", 580, 670],
    ["Good", 670, 800],
    ["Excellent", 800, 850],
  ]);
  for (const [score, rating] of [
    [300, "Poor"],
    [579, "Poor"],
    [580, "Fair"],
    [669, "Fair"],
    [670, "Good"],
    [799, "Good"],
    [800, "Excellent"],
    [850, "Excellent"],
  ] as const)
    expect(creditScoreCopy({ ...report, score }).rating).toBe(rating);
});

it("formats the delta and local date and reads only a visible gauge", () => {
  expect(creditScoreCopy(report, "en-GB")).toMatchObject({
    score: "752",
    delta: "+18 since your last report",
    report: "Report · Updated 19 Nov 2026",
  });
  expect(creditScoreCopy({ ...report, previousScore: 760 }).delta).toBe("-8 since your last report");
  expect(creditScoreCopy({ ...report, previousScore: 752 }).delta).toBe("0 since your last report");
  expect(creditScoreCopy({ ...report, previousScore: undefined }).delta).toBeUndefined();
  expect(creditScoreReading(report, "filled")).toContain("Good (670–800)");
  expect(creditScoreReading({ ...report, detail: "brief" }, "filled")).not.toContain("Good (670–800)");
  expect(creditScoreReading(report, "loading")).toEqual([]);
});

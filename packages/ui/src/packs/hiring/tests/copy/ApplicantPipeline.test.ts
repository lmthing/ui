import { describe, expect, it } from "vitest";
import { applicantCopy, pipelineCopy, pipelineOutcomes, pipelineReading } from "../../copy";

const sam = {
  name: "Sam",
  stage: "screening",
  outcome: "active",
  applied: "2027-04-06",
  next: "Book a meeting",
  nextAt: "2027-04-10",
} as const;
const rows = [
  sam,
  { ...sam, name: "Jo", outcome: "hired" },
  { ...sam, name: "Kai", outcome: "rejected" },
  { ...sam, name: "Lee", outcome: "withdrawn" },
] as const;

describe("ApplicantPipeline copy", () => {
  it("formats dates and counts for the host language without changing authored text", () => {
    expect(applicantCopy(sam, "en-GB")).toEqual({
      applied: "Applied 6 Apr 2027",
      next: "Book a meeting",
      nextAt: "By 10 Apr 2027",
    });
    expect(pipelineCopy(rows, pipelineOutcomes(rows), "ja-JP-u-nu-fullwide").columns[1]?.count).toBe("１");
  });
  it("derives separate per-stage active totals and closed outcomes", () => {
    const closed = pipelineOutcomes(rows);
    const { active, columns, outcomes } = pipelineCopy(rows, closed);
    expect(active).toEqual([sam]);
    expect(columns.map(({ id, count }) => [id, count])).toEqual([
      ["applied", "0"],
      ["screening", "1"],
      ["interview", "0"],
      ["offer", "0"],
    ]);
    expect(outcomes).toBe("Hired: 1 · Rejected: 1 · Withdrawn: 1");
    const reading = pipelineReading([sam], closed);
    expect(reading).toEqual(expect.arrayContaining([outcomes, "Move to", "Applied", "Interview", "Offer"]));
    expect(reading).not.toContain("Screening");
    const allClosed = pipelineReading(rows.slice(1), closed);
    expect(allClosed).toContain("Screening: 0");
    expect(allClosed).not.toContain("Move to");
    expect(allClosed).not.toContain("Lee");
  });
});

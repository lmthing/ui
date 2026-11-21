import { expect, it } from "vitest";
import { candidateCopy, candidateReading } from "../../copy";

const input = {
  applied: "2027-04-06",
  stage: "interview",
  outcome: "active",
  criteria: [{ label: "Work sample", finding: "unreviewed" }],
} as const;

it("localizes application dates and records a finding without inferring one", () => {
  expect(candidateCopy(input, "en-GB")).toEqual({
    applied: "Applied 6 Apr 2027",
    stage: "Interview",
    outcome: "Active",
  });
  expect(candidateReading(input, "en-US")).toEqual(
    expect.arrayContaining(["Applied Apr 6, 2027", "Interview", "Active", "Work sample: Unreviewed"]),
  );
});

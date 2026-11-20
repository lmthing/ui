import { expect, it } from "vitest";
import { triageReading } from "../../copy";

const decision = {
  number: "R-20",
  title: "Damaged latch",
  reportedUrgency: "urgent",
  priority: "normal",
  impact: "site",
  detail: "brief",
  apply: 1,
  canApply: true,
  reason: "Same latch.",
  choices: [
    { id: "r1", kind: "queue", label: "Facilities" },
    { id: "r2", kind: "duplicate", number: "R-10", title: "Latch replacement" },
  ],
};

it("reads the addressed decision without exposing the brief report context", () => {
  const reading = triageReading(decision, "filled", "en-GB").join("\n");
  expect(reading).toContain("Selected: R-10; apply to save");
  expect(reading).toContain("r2 R-10 Latch replacement");
  expect(reading).toContain("Same latch.");
  expect(reading).not.toContain(decision.title);
  expect(reading).not.toContain(decision.number);
  expect(triageReading({ ...decision, detail: "full" }, "filled")).toContain("Impact: whole site");
  expect(triageReading({ ...decision, canApply: false }, "filled").join("\n")).not.toContain("apply to save");
  expect(triageReading(decision, "success")).toEqual(["Triage saved"]);
});

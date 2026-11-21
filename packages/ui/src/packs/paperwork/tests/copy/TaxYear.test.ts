import { describe, expect, it } from "vitest";
import { taxEvidence, taxYearLines } from "../../copy";

describe("tax year evidence", () => {
  const period = { from: "2026-01-01", to: "2026-12-31" };
  const requirements = [
    { label: "Expenses", source: "receipts", tag: "expense", needed: 2 },
    { label: "Supplies", source: "receipts", tag: "supplies", needed: 1 },
    { label: "Statements", source: "documents", tag: "statement", needed: 1 },
  ] as const;
  const receipt = {
    source: "receipts",
    period,
    file: "local:first",
    date: period.from,
    reviewed: true,
    amount: 24.5,
    allocation: 50,
    tags: ["expense", "supplies"],
  };
  it("filters by period, link, usable private file, reviewed flag and tags", () => {
    const evidence = taxEvidence(
      { ...period, requirements },
      {
        paperwork_evidence: [
          receipt,
          receipt,
          { ...receipt, file: "local:last", date: period.to, allocation: undefined },
          { ...receipt, file: "local:no_review", reviewed: false },
          { ...receipt, file: "https://example.test/photo" },
          { ...receipt, file: "local:past", date: "2025-12-31" },
          { ...receipt, file: "local:future", date: "2027-01-01" },
          { ...receipt, file: "local:other_period", period: { ...period, to: "2026-11-30" } },
          { ...receipt, file: "local:unlinked", period: undefined },
          { ...receipt, file: "local:unmatched", tags: ["not-used"] },
          { source: "documents", period, file: "local:statement", tags: ["statement"] },
        ],
      },
      "en",
    );
    expect(evidence.rows.map(({ matched, missing }) => [matched, missing])).toEqual([
      [2, 0],
      [2, 0],
      [1, 0],
    ]);
    expect(evidence).toMatchObject({ receiptTotal: 49, allocationTotal: 12.25, complete: true, ratio: 1 });
    expect(taxYearLines(period, evidence, { currency: ["GBP"] }, "en").at(-1)?.line).toBe(
      "Assigned share £12.25",
    );
  });
  it("retains missing categories with no evidence and no computed completion", () => {
    const evidence = taxEvidence({ ...period, requirements }, {}, "en");
    expect(evidence.rows.map(({ missing }) => missing)).toEqual([2, 1, 1]);
    expect(evidence).toMatchObject({ hasEvidence: false, complete: false, ratio: 0 });
  });
});

import { expect, it } from "vitest";
import { pollDate, pollReading, pollResults } from "../../copy";

const input = {
  options: [
    { label: "North", votes: 1 },
    { label: "South", votes: 2 },
  ],
  voted: 1,
  closes: "2026-11-28",
  detail: "full" as const,
};

it("derives the exact bar ratio, rounded share, localized total and personal tick", () => {
  expect(pollResults(input)).toEqual({
    total: "Total 3 votes",
    rows: [
      { label: "North", share: "33%", ratio: 1 / 3, selected: false },
      { label: "South", share: "67%", ratio: 2 / 3, selected: true },
    ],
  });
  expect(pollResults(input, "ar-EG").total).toBe("Total ٣ votes");
  expect(pollResults({ ...input, options: input.options.slice(0, 1) }).total).toBe("Total 1 vote");
});

it("shows a zero-vote result with empty bars and no tick", () => {
  const zero = { ...input, voted: undefined, options: input.options.map((row) => ({ ...row, votes: 0 })) };
  expect(pollResults(zero)).toEqual({
    total: "Total 0 votes",
    rows: [
      { label: "North", share: "0%", ratio: 0, selected: false },
      { label: "South", share: "0%", ratio: 0, selected: false },
    ],
  });
  expect(pollReading(zero, "filled")).toEqual([pollDate(input)]);
  expect(pollReading(zero, "success")).toContain("South · 0%");
});

it("localizes the date and omits it in brief and when absent", () => {
  expect(pollDate(input, "fr-FR")).toContain("28 nov.");
  const brief = { ...input, detail: "brief" as const };
  expect(pollDate(brief)).toBeUndefined();
  expect(pollDate({ ...input, closes: undefined })).toBeUndefined();
  expect(pollReading(brief, "filled")).toEqual([
    "Total 3 votes",
    "North · 33%",
    "South chosen",
    "South · 67%",
  ]);
});

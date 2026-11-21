import { expect, it } from "vitest";
import { resolutionReading, reviewBlocker } from "../../copy";
import { requestsWordsFor } from "../../lang";

const w = requestsWordsFor("en-GB").resolution;
const evidence = {
  style: "receipt",
  outcome: "duplicate",
  duplicateOf: "SR-17",
  photos: ["lib:fern", "local:2"],
  outcome_choices: ["duplicate"],
  reason: "Same damage",
  liveReason: "Still broken",
  canEnterReason: true,
  checks: [{ text: "Match checked", done: true }],
};

it("separates saved and fresh reasons and hides evidence only from the reading", () => {
  const full = resolutionReading(evidence, "filled", "en-GB");
  expect(full).toEqual(
    expect.arrayContaining([
      w.receipt,
      w.duplicateOf("SR-17"),
      "Same damage",
      "Still broken",
      w.evidence,
      "photo:fern",
      "photo:local:2",
      w.checkLabel("Match checked", true),
      w.reopen,
    ]),
  );
  expect(resolutionReading({ ...evidence, media: "none" }, "filled")).not.toContain("photo:fern");
  expect(resolutionReading(evidence, "success")).not.toContain(w.accept);
});

it("uses the latest review reason for the correct blocker", () => {
  const review = { outcome: "duplicate", canEdit: true, matched: true, reason: "Same damage" } as const;
  expect(reviewBlocker({ ...review, liveReason: " " }, w)).toBe(w.reasonRequired);
  expect(reviewBlocker({ ...review, matched: false }, w)).toBe(w.duplicateMismatch);
  expect(reviewBlocker({ ...review, canEdit: false }, w)).toBe(w.staffOnly);
  expect(reviewBlocker({ ...review, outcome: "workaround" }, w)).toBe(w.workPending);
});

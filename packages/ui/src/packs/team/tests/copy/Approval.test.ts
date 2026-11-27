import { describe, expect, it } from "vitest";
import { approvalAmount, approvalPortrait, approvalReading, approvalStatus } from "../../copy";
import { teamWordsFor } from "../../lang";

describe("Approval copy", () => {
  it("uses a name initial for the generic people reference and keeps authored portraits", () => {
    expect(approvalPortrait("Anna", "lib:people")).toEqual({ initials: "A" });
    expect(approvalPortrait("Rae", "lib:people")).toEqual({ initials: "R" });
    expect(approvalPortrait("Anna", "lib:anna")).toEqual({ photo: "lib:anna" });
    expect(approvalPortrait("Rae", "local:1")).toEqual({ photo: "local:1" });
  });
  it("distinguishes an absent amount from zero and honors the locale", () => {
    expect(approvalAmount(undefined, "de-DE")).toBeUndefined();
    expect(approvalAmount(0, "en-US")).toBe("$0");
    expect(approvalAmount(24.5, "en-US")).toBe("$24.50");
    expect(approvalAmount(24.5, "de-DE")).toBe("24,50\u00a0$");
    expect(approvalAmount(Number.MAX_VALUE, "en-US")).toMatch(/^\$1\.8E308$/);
  });
  it("reads localized kinds, amounts and both visible labels", () => {
    expect(
      approvalReading({ requests: [{ kind: "time_off" }, { kind: "expense", amount: 24.5 }] }, "de-DE"),
    ).toEqual([
      "r1 Time off · Awaiting a decision",
      "r2 Expense · 24,50\u00a0$ · Awaiting a decision",
      "Approve",
      "Decline",
    ]);
  });
  it("distinguishes all three outcomes by text and semantic tone", () => {
    const { approval } = teamWordsFor();
    expect(approvalStatus(undefined, approval)).toEqual({ label: "Awaiting a decision", tone: "muted" });
    expect(approvalStatus("pending", approval)).toEqual(approvalStatus(undefined, approval));
    expect(approvalStatus("approved", approval)).toEqual({ label: "Approved", tone: "good" });
    expect(approvalStatus("declined", approval)).toEqual({ label: "Declined", tone: "bad" });
  });
});

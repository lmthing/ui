import { expect, it } from "vitest";
import { activityCopy, activityMovement, activityReading } from "../../copy";

const row = {
  id: "r1",
  at: "2026-01-01T23:30:00-02:00",
  kind: "buy",
  assetId: "global_fund",
  units: 2,
  unitPrice: 10,
  fee: 1,
} as const;

it("computes signed seed movements for buys, sales, deposits, withdrawals and fees", () => {
  expect(activityMovement(row)).toBe(-21);
  expect(activityMovement({ ...row, kind: "sell" })).toBe(19);
  expect(activityMovement({ ...row, kind: "deposit", amount: 20 })).toBe(20);
  expect(activityMovement({ ...row, kind: "withdrawal", amount: 15 })).toBe(-15);
  expect(activityMovement({ ...row, kind: "fee", amount: 5 })).toBe(-5);
  expect(activityMovement({ ...row, kind: "dividend" })).toBeUndefined();
  expect(activityMovement({ ...row, kind: "dividend", movement: 8 })).toBe(8);
});

it("uses local number and currency copy and retains the original cash for a voided trade", () => {
  expect(activityCopy({ ...row, voided: true }, "en-GB", "GBP")).toMatchObject({
    event: "Buy · global fund",
    at: "2 Jan 2026",
    cash: "-£21",
    status: "Voided",
    tone: "muted",
  });
  const brief = activityReading({ entries: [row], detail: "brief" }).join(" ");
  expect(brief).toContain("-$21");
  expect(brief).not.toContain("per unit");
});

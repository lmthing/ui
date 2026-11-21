import { describe, expect, it } from "vitest";
import { components, stampItemIds } from "@lmthing/ui/catalog";
import { duesProjection, ledgerTotals, type DuesRow } from "../../copy";

const { props, meta, examples } = components.Dues;
const input = examples[0]!;
const receipt = input.receipts[0]!;
const project = (receipts: typeof input.receipts = input.receipts) => {
  const parsed = stampItemIds(meta, props.parse({ ...input, receipts }));
  const derive = duesProjection(() => ({ treasurer: true, today: "2026-04-02", reminders: true }));
  return derive(parsed, "d1").entries as DuesRow[];
};

describe("Dues reconciliation", () => {
  it("excludes voided receipts from totals and computes overdue balances", () => {
    const rows = project();
    expect(rows[0]).toMatchObject({
      paid: 10,
      outstanding: 15,
      credit: 0,
      status: "overdue",
      can_remind: true,
    });
    expect(rows[1]).toMatchObject({ paid: 0, outstanding: 25, status: "overdue" });
    expect(rows[3]).toMatchObject({ kind: "receipt", voided: true, memberId: "lee" });
    expect(ledgerTotals(rows)).toEqual({ assessed: 50, collected: 10, outstanding: 40 });
  });
  it("keeps credit on its own assessment instead of offsetting other members' dues", () => {
    const rows = project([{ ...receipt, amount: 30 }]);
    expect(rows[0]).toMatchObject({ paid: 30, outstanding: 0, credit: 5, status: "paid", can_remind: false });
    expect(ledgerTotals(rows)).toEqual({ assessed: 50, collected: 30, outstanding: 25 });
  });
});

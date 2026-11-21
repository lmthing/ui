import { expect, it } from "vitest";
import { buildHistory, planLedgerOperation, activity, dividends, holdings, type Portfolio } from "./index";
import { date, now, receive, reverse, statement, unwrap } from "./fixtures";

const voidBuy = { kind: "void", id: "first_buy", at: date(7) } as const;
it("freezes entitlement before correcting an earlier trade, even before the first receipt", () => {
  const receivedAfterVoid = { ...receive, at: date(8) };
  const ledger = unwrap(buildHistory(statement, [voidBuy, receivedAfterVoid], now));
  expect(dividends(ledger)).toMatchObject([{ entitledUnits: 10, gross: 10, net: 8 }]);
  expect(unwrap(holdings(ledger))).toMatchObject({ cash: 1008, positions: [] });
  expect(activity(ledger)[1]).toMatchObject({ voided: true, movement: -800, appliedCash: 0 });
  const earlierVoid = { ...voidBuy, at: date(2) };
  expect(dividends(unwrap(buildHistory(statement, [earlierVoid], now)))).toMatchObject([
    { entitledUnits: 0 },
  ]);
});

it("validates exactly one receive, reverse and re-receive, with idempotent retries", () => {
  expect(unwrap(planLedgerOperation(statement, [], receive, now))).toEqual(receive);
  expect(unwrap(planLedgerOperation(statement, [receive], receive, now))).toBeUndefined();
  expect(unwrap(planLedgerOperation(statement, [receive], reverse, now))).toEqual(reverse);
  expect(unwrap(planLedgerOperation(statement, [receive, reverse], reverse, now))).toBeUndefined();
  const again = { ...receive, at: date(10), revision: 2 };
  expect(unwrap(planLedgerOperation(statement, [receive, reverse], again, now))).toEqual(again);
  const operations = [receive, reverse, again];
  expect(unwrap(planLedgerOperation(statement, operations, reverse, now))).toBeUndefined();
  expect(unwrap(planLedgerOperation(statement, operations, receive, now))).toBeUndefined();
  expect(unwrap(planLedgerOperation(statement, [voidBuy], voidBuy, now))).toBeUndefined();
});

it("rejects premature or future receipts, unknown entitlement, excessive withholding and wrong revisions", () => {
  expect(planLedgerOperation(statement, [], { ...receive, at: date(2) }, now)).toMatchObject({
    error: "Entitlement is not known",
  });
  expect(planLedgerOperation(statement, [], { ...receive, at: date(4) }, now)).toMatchObject({
    error: "Receipt precedes the payment day",
  });
  expect(planLedgerOperation(statement, [], { ...receive, at: date(21) }, now)).toMatchObject({
    ok: false,
  });
  for (const op of [reverse, { ...receive, revision: 2 }, { ...receive, id: "other" }])
    expect(planLedgerOperation(statement, [], op, now)).toMatchObject({ ok: false });
  const base = statement.distributions[0]!;
  expect(
    planLedgerOperation({ ...statement, distributions: [{ ...base, withheld: 11 }] }, [], receive, now),
  ).toMatchObject({ error: "Withholding exceeds gross" });
  const unknown = { ...statement, distributions: [{ ...base, entitledAt: "2025-12-31T00:00:00Z" }] };
  expect(dividends(unwrap(buildHistory(unknown, [], now)))).toMatchObject([{ entitledUnits: null }]);
  expect(planLedgerOperation(unknown, [], receive, now)).toMatchObject({ ok: false });
});

it("rejects corrections that invalidate a later sale or cash balance", () => {
  const base: Portfolio = {
    ...statement,
    entries: [
      ...statement.entries,
      { id: "sale", kind: "sell", at: date(8), assetId: "fund", units: 1, unitPrice: 90 },
    ],
  };
  expect(planLedgerOperation(base, [], voidBuy, now)).toMatchObject({
    error: "Sale exceeds units after sale",
  });
  expect(planLedgerOperation(base, [], { ...voidBuy, id: "seed_cash" }, now)).toMatchObject({
    error: "Negative cash after first_buy",
  });
  const withReceipt: Portfolio = {
    ...statement,
    distributions: [{ ...statement.distributions[0]!, receivedAt: receive.at }],
    entries: [...statement.entries, { id: "spent", kind: "withdrawal", at: date(6), amount: 208 }],
  };
  expect(planLedgerOperation(withReceipt, [], reverse, now)).toMatchObject({
    error: "Negative cash after spent",
  });
  expect(planLedgerOperation(withReceipt, [], { ...voidBuy, id: "income" }, now)).toMatchObject({
    error: "No manual entry to void",
  });
});

it("rejects conflicting host seeds and permits equivalent offset quotes", () => {
  const original = statement.quotes[0]!;
  const quote = { ...original, quotedAt: "2026-01-02T19:00:00-05:00" };
  expect(buildHistory({ ...statement, quotes: [original, quote] }, [], now).ok).toBe(true);
  expect(buildHistory({ ...statement, quotes: [original, { ...quote, price: 89 }] }, [], now)).toMatchObject({
    error: "Conflicting quotes at the same time",
  });
  expect(
    buildHistory({ ...statement, entries: [...statement.entries, statement.entries[0]!] }, [], now),
  ).toMatchObject({ error: "Duplicate ledger record" });
});

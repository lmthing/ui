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
  expect(planLedgerOperation(statement, operations, { ...reverse, at: date(4) }, now)).toMatchObject({
    error: "Conflicting ledger operation",
  });
  expect(planLedgerOperation(statement, operations, { ...receive, at: date(6) }, now)).toMatchObject({
    error: "Conflicting ledger operation",
  });
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

it("validates refreshed histories after merging all host and local receipts", () => {
  const spend: Portfolio["entries"][number] = { id: "spent", kind: "withdrawal", at: date(10), amount: 216 };
  const second = { ...statement.distributions[0]!, id: "second_income" };
  const extraReceipt = { ...receive, id: second.id, at: date(8) };
  const refreshed = {
    ...statement,
    entries: [...statement.entries, spend],
    distributions: [...statement.distributions, second],
  };
  const both = unwrap(buildHistory(refreshed, [receive, extraReceipt], now));
  expect(unwrap(holdings(both)).cash).toBe(0);
  const imported = {
    ...refreshed,
    distributions: [...statement.distributions, { ...second, receivedAt: date(8) }],
  };
  expect(unwrap(holdings(unwrap(buildHistory(imported, [receive], now)))).cash).toBe(0);
  expect(unwrap(holdings(unwrap(buildHistory(imported, [receive, extraReceipt], now)))).cash).toBe(0);
});

it("can fund a same-instant reinvestment with a receipt for an earlier entitlement", () => {
  const updated: Portfolio = {
    ...statement,
    entries: [
      ...statement.entries,
      { kind: "buy", id: "reinvest", assetId: "fund", units: 2, unitPrice: 104, at: receive.at },
    ],
  };
  const ledger = unwrap(buildHistory(updated, [receive], now));
  expect(unwrap(holdings(ledger))).toMatchObject({ cash: 0, positions: [{ units: 12 }] });
  expect(
    activity(ledger)
      .slice(-2)
      .map((row) => row.kind),
  ).toEqual(["dividend", "buy"]);
});

it("uses UTC payment days in both authorization and receipt validation", () => {
  const offset = "2026-01-05T00:30:00+01:00";
  const instant = Date.parse(offset);
  expect(dividends(unwrap(buildHistory(statement, [], instant)))[0]?.canReceive).toBe(false);
  expect(planLedgerOperation(statement, [], { ...receive, at: offset }, instant)).toMatchObject({
    error: "Receipt precedes the payment day",
  });
  const later = "2026-01-04T23:30:00-01:00";
  expect(dividends(unwrap(buildHistory(statement, [], Date.parse(later))))[0]?.canReceive).toBe(true);
  expect(planLedgerOperation(statement, [], { ...receive, at: later }, Date.parse(later)).ok).toBe(true);
});

it("does not collapse sub-millisecond host events into insertion-order ties", () => {
  const invalidPrecision = {
    ...statement,
    entries: [
      { ...statement.entries[1]!, at: "2026-01-02T00:00:00.0002Z" },
      { ...statement.entries[0]!, at: "2026-01-02T00:00:00.0001Z" },
    ],
  };
  expect(buildHistory(invalidPrecision, [], now)).toMatchObject({
    ok: false,
    error: "Invalid portfolio statement or time",
  });
});

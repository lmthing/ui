import { expect, it } from "vitest";
import { buildHistory, activity, dividends, holdings, performance, type Portfolio } from "./index";
import { date, now, receive, reverse, statement, unwrap } from "./fixtures";

it("replays the worked zero-unit opening into a real holding and portfolio value", () => {
  const initial = unwrap(buildHistory(statement, [], now));
  expect(unwrap(holdings(initial))).toMatchObject({
    cash: 200,
    totalValue: 1100,
    positions: [{ assetId: "fund", id: "r1", units: 10, costBasis: 800, price: 90, value: 900, gain: 100 }],
  });
  expect(unwrap(holdings(unwrap(buildHistory(statement, [receive], now))))).toMatchObject({
    cash: 208,
    totalValue: 1108,
  });
});

it("uses weighted-average cost including buy fees and removes cost proportionally on sale", () => {
  const base: Portfolio = {
    ...statement,
    openingCash: 20,
    entries: [
      { id: "buy_one", at: date(2), kind: "buy", assetId: "fund", units: 0.1, unitPrice: 10, fee: 0.1 },
      { id: "buy_two", at: date(3), kind: "buy", assetId: "fund", units: 0.2, unitPrice: 20, fee: 0.3 },
      { id: "sell", at: date(4), kind: "sell", assetId: "fund", units: 0.2, unitPrice: 25, fee: 0.1 },
    ],
  };
  const ledger = unwrap(buildHistory(base, [], now));
  expect(unwrap(holdings(ledger))).toMatchObject({
    cash: 19.5,
    positions: [{ units: 0.1, unitCost: 18, costBasis: 1.8, value: 9, gain: 7.2 }],
  });
  expect(unwrap(holdings(ledger, "other")).positions).toEqual([]);
  expect(unwrap(holdings(unwrap(buildHistory({ ...base, quotes: [] }, [], now))))).toMatchObject({
    totalValue: null,
    positions: [{ value: null, gain: null }],
  });
});

it("values each sample from its own prices and tracks lifetime net contributions, cash and units", () => {
  const ledger = unwrap(
    buildHistory(
      {
        ...statement,
        openingContributed: -5,
        entries: [
          ...statement.entries,
          { id: "withdraw", at: date(6), kind: "withdrawal", amount: 30 },
          { id: "fee", at: date(7), kind: "fee", amount: 2 },
        ],
      },
      [receive],
      now,
    ),
  );
  const quotes = (price: number) => [{ assetId: "fund", price }];
  expect(
    unwrap(
      performance(ledger, [
        { at: date(1), quotes: [] },
        { at: date(3), quotes: quotes(90) },
        { at: date(5), quotes: [] },
        { at: date(7), quotes: quotes(0) },
      ]),
    ),
  ).toMatchObject([
    { cash: 0, units: { fund: 0 }, contributed: -5, value: 0, gain: 5 },
    { cash: 200, units: { fund: 10 }, contributed: 995, value: 1100, gain: 105 },
    { cash: 208, units: { fund: 10 }, contributed: 995, value: null, gain: null, missing: ["fund"] },
    { cash: 176, units: { fund: 10 }, contributed: 965, value: 176, gain: -789 },
  ]);
});

it("rejects unordered, duplicate and pre-opening samples and duplicate quotes", () => {
  const ledger = unwrap(buildHistory(statement, [], now));
  const s = { at: date(4), quotes: [] };
  for (const samples of [
    [s, { ...s, at: date(1) }],
    [s, { ...s, at: "2026-01-03T19:00:00-05:00" }],
    [{ ...s, at: "2025-12-31T00:00:00Z" }],
    [
      {
        ...s,
        quotes: [
          { assetId: "fund", price: 0 },
          { assetId: "fund", price: 0 },
        ],
      },
    ],
  ])
    expect(performance(ledger, samples)).toMatchObject({ ok: false });
});

it("combines reversed and active receipts with manual rows without reassigning their addresses", () => {
  const again = { ...receive, at: date(10), revision: 2 };
  const ledger = unwrap(buildHistory(statement, [receive, reverse, again], now));
  expect(activity(ledger)).toMatchObject([
    { id: "r1", kind: "deposit", movement: 1000 },
    { id: "r2", kind: "buy", movement: -800 },
    { id: "r3", kind: "dividend", movement: 8, appliedCash: 0, voided: true, canVoid: false },
    { id: "r4", kind: "dividend", movement: 8, appliedCash: 8, voided: false, canVoid: false },
  ]);
  expect(dividends(ledger)).toMatchObject([{ entitledUnits: 10, gross: 10, net: 8, receivedAt: date(10) }]);
});

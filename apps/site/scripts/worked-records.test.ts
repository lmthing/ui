import { components, packExamples } from "@lmthing/ui/catalog";
import { expect, it } from "vitest";
import { workedRecords } from "./worked-records";

it("uses the worked opening position and journal, not the Holdings preview or a calculated balance", () => {
  const lines = packExamples.invest.trim().split("\n");
  const records = workedRecords("invest", lines, components);
  expect(records?.investment_portfolios).toEqual([
    expect.objectContaining({
      portfolioId: "education",
      openingCash: 0,
      openingContributed: 0,
      positions: [expect.objectContaining({ assetId: "global_fund", units: 0, unitCost: 0 })],
      entries: [
        expect.objectContaining({ kind: "deposit", amount: 1000 }),
        expect.objectContaining({ kind: "buy", units: 10, unitPrice: 80 }),
      ],
      quotes: [{ assetId: "global_fund", price: 90, quotedAt: "2026-03-01T16:00:00Z" }],
    }),
  ]);
});

it("leaves examples without a snapshot and packs without worked lines unchanged", () => {
  expect(workedRecords("customers", packExamples.customers.trim().split("\n"), components)).toBeUndefined();
  expect(workedRecords("invest", [], components)).toBeUndefined();
});

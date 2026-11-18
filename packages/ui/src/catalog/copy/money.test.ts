import { expect, it } from "vitest";
import { changeLine, compactMoneyLine, currencies, defaultCurrency, moneyLine, moneyLabels } from "./money";

it("keeps currency defaults and money formatting unchanged", () => {
  expect(currencies).toHaveLength(21);
  expect(defaultCurrency).toBe("USD");
  expect(moneyLabels.total).toBe("Total");
  expect(moneyLine(1240.5)).toBe("$1,240.50");
  expect(moneyLine(120, "EUR", "night")).toBe("€120 / night");
  expect(moneyLine(18, "GBP", "each")).toBe("£18 / each");
  expect(changeLine(32, "money")).toBe("+$32");
  expect(changeLine(-4.5, "money", "EUR")).toBe("-€4.50");
  expect(changeLine(3.2, "percent")).toBe("+3.2%");
  expect(changeLine(0, "percent")).toBe("0%");
});

it("keeps ordinary prices exact and bounds large displayed prices", () => {
  expect([compactMoneyLine(0), compactMoneyLine(15.5), compactMoneyLine(9999.99)]).toEqual([
    "$0",
    "$15.50",
    "$9,999.99",
  ]);
  expect(compactMoneyLine(10000)).toBe("$10K");
  expect(compactMoneyLine(1e15)).toBe("$1E15");
  expect(compactMoneyLine(Number.MAX_VALUE)).toBe("$1.8E308");
});

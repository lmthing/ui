import { expect, it } from "vitest";
import { changeLine, currencies, defaultCurrency, moneyLine, moneyLabels } from "./money";

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

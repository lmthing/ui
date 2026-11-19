import { describe, expect, it } from "vitest";
import { ingredientAmount, ingredientsReading, servingCount } from "../../copy";

describe("Ingredients fixed quantities", () => {
  it.each([
    [0.25, "¼", "piece"],
    [0.5, "½", "piece"],
    [0.75, "¾", "piece"],
    [1.25, "1¼", "pieces"],
    [0, "0", "pieces"],
    [100000, "100000", "pieces"],
    [8, "8", "pieces"],
    [1, "1", "piece"],
  ])("formats %s without decimal quarters", (amount, expected, unit) => {
    expect(ingredientAmount({ name: "Seed", amount: Number(amount), unit: "piece" }, 1, "us")).toEqual({
      amount: expected,
      unit,
    });
  });
  it.each([
    [28.349523125, "g", "us", "1", "oz"],
    [0.45359237, "kg", "us", "1", "lb"],
    [236.5882365, "ml", "us", "1", "cup"],
    [0.2365882365, "l", "us", "1", "cup"],
    [1, "cup", "metric", "236.6", "ml"],
    [1, "tbsp", "metric", "14.79", "ml"],
    [1, "tsp", "metric", "4.929", "ml"],
  ] as const)("converts %s %s to %s with fixed customary rules", (amount, unit, system, expected, shown) => {
    expect(ingredientAmount({ name: "Seed", amount, unit }, 1, system)).toEqual({
      amount: expected,
      unit: shown,
    });
  });
  it("scales from seed, preserves nonconvertible units and never invents missing amounts", () => {
    expect(ingredientAmount({ name: "Seed", amount: 600, unit: "g" }, 6 / 4, "metric")).toEqual({
      amount: "900",
      unit: "g",
    });
    expect(ingredientAmount({ name: "Seed", unit: "pinch" }, 2, "us")).toEqual({ amount: "", unit: "pinch" });
    expect(ingredientAmount({ name: "Seed", unit: "none" }, 2, "metric")).toEqual({ amount: "", unit: "" });
    expect(ingredientAmount({ name: "Seed", amount: 0.00001, unit: "none" }, 1, "us").amount).not.toBe("0");
  });
  it("bounds every serving delta and keeps the seed stable", () => {
    expect(servingCount(4, 2)).toBe(6);
    expect(servingCount(4, 0)).toBe(4);
    expect(servingCount(1, -1)).toBe(1);
    expect(servingCount(24, 1)).toBe(24);
  });
});
describe("Ingredients readings", () => {
  it("ties every group ingredient to its flat item address and screen text", () => {
    expect(
      ingredientsReading({
        servings: 2,
        system: "us",
        groups: [
          { label: "First", items: [{ name: "Seed", amount: 0.5, unit: "cup", note: "Cold" }] },
          { items: [{ name: "Second", unit: "none" }] },
        ],
      }),
    ).toEqual([
      "2 Servings",
      "Metric",
      "US",
      "Add missing to groceries",
      "First",
      "r1: Seed ½ cup Cold",
      "r2: Second",
    ]);
  });
});

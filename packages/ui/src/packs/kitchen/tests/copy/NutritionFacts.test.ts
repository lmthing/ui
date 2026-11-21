import { describe, expect, it } from "vitest";
import { nutritionAmountMax, nutritionDisplay, nutritionReading } from "../../copy";

const input = {
  detail: "full",
  calories: 300,
  protein: 10,
  carbs: 20,
  fat: 10,
  servings: 1.25,
  servingLabel: "1 bowl",
  nutrients: [{ label: "Fiber", amount: 1.8, unit: "g", tone: "neutral" }],
  allergens: ["Milk", "Wheat"],
} as const;

describe("NutritionFacts copy", () => {
  it("scales per-serving calories, macro grams and nutrients and computes gram shares", () => {
    expect(nutritionReading(input, "filled")).toEqual([
      "Servings: 1.25",
      "Calories: 375 kcal",
      "Servings · 1 bowl",
      "Macro grams and share by weight",
      "Protein: 12.5 (25%)",
      "Carbs: 25 (50%)",
      "Fat: 12.5 (25%)",
      "Other nutrients",
      "Fiber: 2.25 g",
      "Contains: Milk, Wheat",
      "Log portion",
    ]);
  });
  it("uses the requested locale for servings, quantities and percentages", () => {
    const lines = nutritionReading({ ...input, detail: "brief" }, "filled", "fr-FR");
    expect(lines).toContain("Servings: 1,25");
    expect(lines).toContain("Protein: 12,5 (25 %)");
    expect(lines.join("\n")).not.toMatch(/Fiber|Milk|Wheat/);
  });
  it("uses a zero share for all-zero macros and finite shares for the largest valid inputs", () => {
    const zero = nutritionDisplay({ ...input, protein: 0, carbs: 0, fat: 0 });
    expect(zero.percent(zero.macro("protein").value, 0)).toBe("0%");
    const max = nutritionDisplay({
      ...input,
      servings: 12,
      protein: nutritionAmountMax,
      carbs: nutritionAmountMax,
      fat: nutritionAmountMax,
    });
    expect(max.percent(max.macro("protein").value, max.macro("protein").value * 3)).toBe("33%");
  });
});

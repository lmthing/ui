import { describe, expect, it } from "vitest";
import { foodLogLabels, foodLogRead, foodLogTotal, kcalLine, targetLine } from "../../copy";
import { foodLogGroups } from "../../copy";

describe("FoodLog copy", () => {
  it("groups addressed rows without changing order, including empty meals", () => {
    const meals = [
      { meal: "breakfast" as const, items: [{ name: "Food", kcal: 1 }] },
      { meal: "lunch" as const, items: [] },
    ];
    expect(foodLogGroups(meals, ["r1", "r2", "r3"])).toEqual([["r1", "r2"], ["r3"]]);
  });
  it("labels each meal and its add action", () => {
    for (const meal of ["breakfast", "lunch", "dinner", "snack"] as const) {
      expect(foodLogLabels.meals[meal].toLowerCase()).toBe(meal);
      expect(foodLogLabels.add(foodLogLabels.meals[meal])).toBe(`Add food to ${meal}`);
    }
    expect(kcalLine(0)).toBe("0 kcal");
    expect(targetLine(2000)).toBe("of 2000 kcal");
  });
  it("computes totals across all groups, including empty and maximum meals", () => {
    expect(foodLogTotal([])).toBe(0);
    expect(foodLogTotal([{ meal: "snack", items: [] }])).toBe(0);
    const meals = ["breakfast", "lunch", "dinner", "snack"].map((meal) => ({
      meal: meal as "breakfast",
      items: Array.from({ length: 6 }, () => ({ name: "Food", kcal: 10000 })),
    }));
    expect(foodLogTotal(meals)).toBe(240000);
    expect(foodLogLabels.share(240000, 1)).toBe("24000000%");
  });
  it("reads actual calories, optional amounts, empty meals and stable flattened addresses", () => {
    const meals = [
      {
        meal: "dinner" as const,
        items: [
          { name: "Lasagne", kcal: 520, amount: "1 slice" },
          { name: "Milk", kcal: 90 },
        ],
      },
      { meal: "snack" as const, items: [] },
    ];
    expect(foodLogRead({ meals, target: 2000 })).toEqual([
      "Total 610 kcal",
      "of 2000 kcal",
      "Daily target",
      "31%",
      "r1: Dinner",
      "r2: Lasagne 520 kcal · 1 slice",
      "r3: Milk 90 kcal",
      "r4: Snack",
    ]);
    expect(foodLogRead({ meals })).not.toContain("Daily target");
    expect(foodLogRead({ meals: [{ meal: "snack", items: [] }], target: 1 })[0]).toBe("Total 0 kcal");
  });
});

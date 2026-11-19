import { describe, expect, it } from "vitest";
import { mealPlanLabels, mealPlanReading, mealPlanWeek, mealPlanToday } from "../../copy";

describe("MealPlan copy", () => {
  it("formats the stored Monday independently of the local timezone", () => {
    expect(mealPlanWeek("2026-11-16")).toBe("Week of 16 Nov 2026");
  });
  it("names each meal and distinguishes filled recipes from empty add cells", () => {
    expect(
      mealPlanReading("2026-11-16", [
        { day: 0, meal: "lunch" },
        { day: 3, meal: "dinner", title: "Lasagne" },
      ]),
    ).toEqual(["Week of 16 Nov 2026", "r1: Monday Lunch · Add", "r2: Thursday Dinner · Lasagne"]);
    expect(Object.keys(mealPlanLabels)).toEqual(["breakfast", "lunch", "dinner", "snack", "add"]);
  });
  it.each([0, 1, 2, 3, 4, 5, 6])("finds local weekday %i at either end of the day", (day) => {
    for (const hour of [0, 23])
      expect(mealPlanToday("2026-11-16", new Date(2026, 10, 16 + day, hour))).toBe(String(day));
  });
  it.each([new Date(2026, 10, 15, 23), new Date(2026, 10, 23)])("does not highlight another week", (now) => {
    expect(mealPlanToday("2026-11-16", now)).toBeUndefined();
  });
  it("handles month and year boundaries", () => {
    expect(mealPlanToday("2026-12-28", new Date(2027, 0, 3, 23))).toBe("6");
  });
});

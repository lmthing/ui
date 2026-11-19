import { expect, it } from "vitest";
import { components } from "@lmthing/ui/catalog";

const ingredient = { name: "a".repeat(28), amount: 100000, unit: "g", note: "a".repeat(20) };
const aisleItem = { name: "a".repeat(28), qty: "a".repeat(12), got: false, by: "a".repeat(12) };
const pantryItem = {
  name: "a".repeat(24),
  qty: "a".repeat(12),
  place: "fridge",
  useBy: "2026-11-20",
  goto: "details",
};
const foodItem = { name: "a".repeat(28), kcal: 10000, amount: "a".repeat(12) };
const meals = ["breakfast", "lunch", "dinner", "snack"];

it("accepts the maximum ingredient, step and meal-plan contracts", () => {
  expect(
    components.Ingredients.props.safeParse({
      servings: 24,
      groups: Array.from({ length: 3 }, () => ({
        label: "a".repeat(20),
        items: Array.from({ length: 16 }, () => ingredient),
      })),
      system: "us",
    }).success,
  ).toBe(true);
  expect(
    components.CookSteps.props.safeParse({
      steps: Array.from({ length: 20 }, () => ({
        text: "a".repeat(200),
        uses: Array.from({ length: 4 }, () => "a".repeat(20)),
        minutes: 240,
      })),
      at: 20,
    }).success,
  ).toBe(true);
  expect(
    components.MealPlan.props.safeParse({
      week: "2026-11-16",
      meals,
      cells: Array.from({ length: 7 }, (_, day) =>
        meals.map((meal) => ({ day, meal, title: "a".repeat(24), photo: "local:1", goto: "details" })),
      ).flat(),
    }).success,
  ).toBe(true);
  expect(
    components.MealPlan.props.safeParse({ week: "2026-11-16", meals: ["dinner"], cells: [] }).success,
  ).toBe(true);
});
it("accepts the maximum grocery, pantry, food and timer contracts", () => {
  expect(
    components.GroceryList.props.safeParse({
      aisles: Array.from({ length: 8 }, () => ({
        label: "a".repeat(16),
        items: Array.from({ length: 12 }, () => aisleItem),
      })),
    }).success,
  ).toBe(true);
  expect(
    components.Pantry.props.safeParse({ items: Array.from({ length: 20 }, () => pantryItem) }).success,
  ).toBe(true);
  expect(
    components.FoodLog.props.safeParse({
      meals: meals.map((meal) => ({ meal, items: Array.from({ length: 6 }, () => foodItem) })),
      target: 20000,
      goto: "food_add",
    }).success,
  ).toBe(true);
  expect(
    components.FoodLog.props.safeParse({ meals: [{ meal: "dinner", items: [] }], goto: "food_add" }).success,
  ).toBe(true);
  expect(
    components.KitchenTimers.props.safeParse({
      timers: Array.from({ length: 6 }, () => ({ label: "a".repeat(16), seconds: 14400 })),
    }).success,
  ).toBe(true);
});
const invalid = {
  Ingredients: [
    { servings: 0, groups: [{ items: [ingredient] }] },
    { servings: 25, groups: [{ items: [ingredient] }] },
    { servings: 1, groups: [] },
    { servings: 1, groups: Array.from({ length: 4 }, () => ({ items: [ingredient] })) },
    { servings: 1, groups: [{ items: [] }] },
    { servings: 1, groups: [{ items: Array.from({ length: 17 }, () => ingredient) }] },
    { servings: 1, groups: [{ label: "a".repeat(21), items: [ingredient] }] },
    ...[
      { name: "a".repeat(29) },
      { note: "a".repeat(21) },
      { amount: -1 },
      { unit: "oz" },
      { color: "red" },
    ].map((extra) => ({ servings: 1, groups: [{ items: [{ ...ingredient, ...extra }] }] })),
  ],
  CookSteps: [
    { steps: [] },
    { steps: Array.from({ length: 21 }, () => ({ text: "Step" })) },
    { steps: [{ text: "Step" }], at: 0 },
    { steps: [{ text: "Step" }], at: 2 },
    { steps: [{ text: "a".repeat(201) }] },
    { steps: [{ text: "Step", uses: ["a".repeat(21)] }] },
    { steps: [{ text: "Step", uses: Array.from({ length: 5 }, () => "Item") }] },
    { steps: [{ text: "Step", minutes: -1 }] },
  ],
  MealPlan: [
    { week: "2026-11-17", meals: ["dinner"], cells: [] },
    { week: "2026-02-30", meals: ["dinner"], cells: [] },
    { week: "2026-11-16", meals: [], cells: [] },
    { week: "2026-11-16", meals: ["dinner", "dinner"], cells: [] },
    ...[
      { day: 7 },
      { meal: "lunch" },
      { title: "a".repeat(25) },
      { photo: "https://example.org/photo" },
      { goto: "Bad ID" },
    ].map((extra) => ({
      week: "2026-11-16",
      meals: ["dinner"],
      cells: [{ day: 0, meal: "dinner", title: "Food", goto: "details", ...extra }],
    })),
    {
      week: "2026-11-16",
      meals: ["dinner"],
      cells: Array.from({ length: 2 }, () => ({
        day: 0,
        meal: "dinner",
        title: "Food",
        goto: "details",
      })),
    },
  ],
  GroceryList: [
    { aisles: [] },
    { aisles: [{ label: "Aisle", items: [] }] },
    { aisles: Array.from({ length: 9 }, () => ({ label: "Aisle", items: [aisleItem] })) },
    { aisles: [{ label: "Aisle", items: Array.from({ length: 13 }, () => aisleItem) }] },
    { aisles: [{ label: "a".repeat(17), items: [aisleItem] }] },
    ...[{ name: "a".repeat(29) }, { qty: "a".repeat(13) }, { by: "a".repeat(13) }, { got: "yes" }].map(
      (extra) => ({ aisles: [{ label: "Aisle", items: [{ ...aisleItem, ...extra }] }] }),
    ),
  ],
  Pantry: [
    { items: [] },
    { items: Array.from({ length: 21 }, () => pantryItem) },
    ...[
      { name: "a".repeat(25) },
      { qty: "a".repeat(13) },
      { place: "shed" },
      { useBy: "2026-02-30" },
      { tone: "bad" },
    ].map((extra) => ({ items: [{ ...pantryItem, ...extra }] })),
  ],
  FoodLog: [
    { meals: [], goto: "food_add" },
    { meals: [{ meal: "dinner", items: Array.from({ length: 7 }, () => foodItem) }], goto: "food_add" },
    { meals: Array.from({ length: 2 }, () => ({ meal: "dinner", items: [] })), goto: "food_add" },
    ...[{ name: "a".repeat(29) }, { amount: "a".repeat(13) }, { kcal: -1 }, { total: 1 }].map((extra) => ({
      meals: [{ meal: "dinner", items: [{ ...foodItem, ...extra }] }],
      goto: "food_add",
    })),
  ],
  KitchenTimers: [
    { timers: [] },
    { timers: Array.from({ length: 7 }, () => ({ label: "Timer", seconds: 1 })) },
    ...[
      { label: "a".repeat(17) },
      { seconds: 0 },
      { seconds: 14401 },
      { seconds: 1.5 },
      { remaining: 1 },
    ].map((extra) => ({ timers: [{ label: "Timer", seconds: 1, ...extra }] })),
  ],
};
it("rejects overlong text, bad enums, missing data and cross-field inconsistencies", () => {
  for (const [id, inputs] of Object.entries(invalid))
    for (const input of inputs)
      expect(
        components[id as keyof typeof invalid].props.safeParse(input).success,
        `${id}: ${JSON.stringify(input)}`,
      ).toBe(false);
});

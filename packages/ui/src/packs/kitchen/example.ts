import type { Component } from "../../catalog";

const lines = [
  { id: "h1", c: "Header", title: "Nonna's lasagne", style: "back" },
  {
    id: "i1",
    c: "Ingredients",
    servings: 4,
    system: "metric",
    groups: [
      {
        label: "Sauce",
        items: [
          { name: "Tomatoes", amount: 600, unit: "g", note: "Chopped" },
          { name: "Olive oil", amount: 2, unit: "tbsp" },
        ],
      },
      {
        label: "Layers",
        items: [
          { name: "Lasagne sheets", amount: 8, unit: "piece" },
          { name: "Ricotta", amount: 250, unit: "g" },
        ],
      },
    ],
  },
  {
    id: "c1",
    c: "CookSteps",
    steps: [
      { text: "Simmer the tomatoes and oil.", uses: ["Tomatoes", "Olive oil"], minutes: 20 },
      { text: "Layer the sauce, pasta and ricotta.", uses: ["Lasagne sheets", "Ricotta"] },
      { text: "Bake until golden.", uses: [], minutes: 40 },
    ],
    at: 1,
  },
  {
    id: "k1",
    c: "KitchenTimers",
    timers: [
      { label: "Béchamel", seconds: 372 },
      { label: "Oven", seconds: 1120 },
    ],
  },
  {
    id: "m1",
    c: "MealPlan",
    week: "2026-11-16",
    meals: ["lunch", "dinner"],
    cells: [{ day: 3, meal: "dinner", title: "Nonna's lasagne", photo: "lib:food", goto: "recipe_overview" }],
  },
  {
    id: "g1",
    c: "GroceryList",
    aisles: [
      { label: "Produce", items: [{ name: "Tomatoes", qty: "600 g", got: false, by: "Sam" }] },
      { label: "Dairy", items: [{ name: "Ricotta", qty: "250 g", got: false }] },
    ],
  },
  {
    id: "p1",
    c: "Pantry",
    items: [
      { name: "Ricotta", qty: "250 g", place: "fridge", useBy: "2026-11-20", goto: "food_details" },
      { name: "Lasagne sheets", qty: "1 box", place: "cupboard", goto: "food_details" },
    ],
  },
  {
    id: "f1",
    c: "FoodLog",
    meals: [
      { meal: "dinner", items: [{ name: "Lasagne", kcal: 520, amount: "1 slice" }] },
      { meal: "snack", items: [] },
    ],
    target: 2000,
    goto: "food_add",
  },
] satisfies Component[];

export const example = `${lines.map((line) => JSON.stringify(line)).join("\n")}\n`;

import type { LDMLPluralRule } from "../../../catalog";

const meals = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snack" };
const places = { cupboard: "Cupboard", fridge: "Fridge", freezer: "Freezer" };

export const en = {
  kcalUnit: "kcal",
  cookStepsLabels: {
    timer: "Cooking timer",
    next: "Next step",
    back: "Back",
    done: "Recipe complete",
    finished: "All steps finished.",
  },
  foodLogLabels: {
    meals,
    target: "Daily target",
    add: (meal: string): string => `Add food to ${meal.toLowerCase()}`,
  },
  groceryLabels: {
    newItem: "Type a new grocery item",
    allGot: "Everything is in the bag",
  },
  ingredientsLabels: {
    servings: "Servings",
    less: "One fewer serving",
    more: "One more serving",
    system: "Units",
    metric: "Metric",
    us: "US",
    shop: "Add missing to groceries",
  },
  ingredientServings: (count: string, label: string) => `${count} ${label}`,
  ingredientUnits: {
    g: "g",
    kg: "kg",
    ml: "ml",
    l: "l",
    tsp: "tsp",
    tbsp: "tbsp",
    cup: "cup",
    piece: "piece",
    pinch: "pinch",
    oz: "oz",
    lb: "lb",
    none: "",
  },
  // Match the existing English quantity convention: fractions under one use “piece”.
  ingredientPieces: (value: number, _form: LDMLPluralRule): string =>
    value === 0 || value > 1 ? "pieces" : "piece",
  ingredientFractions: ["", "¼", "½", "¾"],
  mealPlanLabels: { ...meals, add: "Add" },
  mealPlanWeek: (date: string) => `Week of ${date}`,
  pantryLabels: {
    ...places,
    used: "Used up",
    expired: "Expired",
    soon: "Use soon",
    dated: "Use by",
    undated: "Use-by date",
    missing: "Not set",
  },
  pantryPlace: (place: string) => place.toLowerCase(),
};

export type KitchenWords = typeof en;

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
    meals: { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snack" },
    target: "Daily target",
    add: (meal: "breakfast" | "lunch" | "dinner" | "snack"): string => `Add food to ${meal}`,
  },
};

export type KitchenWords = typeof en;

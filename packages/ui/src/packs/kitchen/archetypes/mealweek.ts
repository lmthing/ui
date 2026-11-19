import type { ArchetypeMeta } from "../../../catalog";

export const mealweek = {
  id: "mealweek",
  job: "The week's meals",
  defaultLayout: "week",
  layouts: {
    week: {
      writeHints: [
        "Keep Header, MealPlan and Button in order even with no cast. MealPlan may use its neutral Monday week, a dinner column and empty cells. Return the complete screen object, not only MealPlan props.",
      ],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["MealPlan"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "m1", c: "MealPlan" },
        { id: "b1", c: "Button" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

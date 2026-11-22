import { meals } from "./pack";

export const words = {
  mealPlanLabels: { ...meals, add: "Add" },
  mealPlanEmpty: "No meals yet.",
  mealPlanWeek: (date: string) => `Week of ${date}`,
  mealPlanAdd: (meal: string) => `Add ${meal.toLowerCase()}`,
};

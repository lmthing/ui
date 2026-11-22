import { meals } from "./pack";

export const words = {
  foodLogLabels: {
    meals,
    target: "Daily target",
    add: (meal: string): string => `Add food to ${meal.toLowerCase()}`,
  },
};

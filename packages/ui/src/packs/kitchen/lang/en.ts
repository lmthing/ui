import { words as packWords } from "./en/pack";
import { words as NutritionFactsWords } from "./en/NutritionFacts";
import { words as CookStepsWords } from "./en/CookSteps";
import { words as KitchenTimersWords } from "./en/KitchenTimers";
import { words as FoodLogWords } from "./en/FoodLog";
import { words as GroceryListWords } from "./en/GroceryList";
import { words as IngredientsWords } from "./en/Ingredients";
import { words as MealPlanWords } from "./en/MealPlan";
import { words as PantryWords } from "./en/Pantry";

export const en = {
  ...packWords,
  ...NutritionFactsWords,
  ...CookStepsWords,
  ...KitchenTimersWords,
  ...FoodLogWords,
  ...GroceryListWords,
  ...IngredientsWords,
  ...MealPlanWords,
  ...PantryWords,
};

export type KitchenWords = typeof en;

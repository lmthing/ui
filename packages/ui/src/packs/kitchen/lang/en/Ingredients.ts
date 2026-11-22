import type { LDMLPluralRule } from "../../../../catalog";

export const words = {
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
  ingredientSwap: (swap: string) => `Swap: ${swap}`,
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
};

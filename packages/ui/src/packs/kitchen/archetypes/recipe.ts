import type { ArchetypeMeta } from "../../../catalog";

export const recipe = {
  id: "recipe",
  job: "One recipe",
  defaultLayout: "overview",
  layouts: {
    overview: {
      writeHints: [
        'Use media "cover" for the Hero recipe photo and arrange "grid" for the KeyValue recipe facts.',
      ],
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["Hero"], required: true },
        { allow: ["KeyValue"], required: true },
        { allow: ["Ingredients"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "h2", c: "Hero", media: "cover" },
        { id: "k1", c: "KeyValue", arrange: "grid" },
        { id: "i1", c: "Ingredients" },
        { id: "b1", c: "Button" },
      ],
    },
    nutrition: {
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["NutritionFacts"], required: true },
        { allow: ["Note"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "n1", c: "NutritionFacts" },
        { id: "n2", c: "Note" },
      ],
    },
    cook: {
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["CookSteps"], required: true },
        { allow: ["KitchenTimers"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "c1", c: "CookSteps" },
        { id: "k1", c: "KitchenTimers" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

import { packKeyValueDefaults, type ArchetypeMeta } from "../../../catalog";

export const recipe = {
  id: "recipe",
  job: "One recipe",
  defaultLayout: "overview",
  layouts: {
    overview: {
      writeHints: ['Use arrange "grid" for the KeyValue recipe facts.'],
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["Hero"], required: true, variant: "photo" },
        { allow: ["KeyValue"], required: true },
        { allow: ["Ingredients"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "h2", c: "Hero", style: "photo" },
        { id: "k1", c: "KeyValue", ...packKeyValueDefaults["recipe/overview"] },
        { id: "i1", c: "Ingredients" },
        { id: "b1", c: "Button" },
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

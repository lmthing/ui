import type { ArchetypeMeta } from "../../../catalog";

export const groceries = {
  id: "groceries",
  job: "Buying food",
  defaultLayout: "list",
  layouts: {
    list: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["GroceryList"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "g1", c: "GroceryList" },
        { id: "b1", c: "Button" },
      ],
    },
    pantry: {
      writeHints: [
        "Keep the requested Segmented labels, with filter:null and view:null on every option. This layout has one Pantry, not a List or separate category panels. Keep the stock in that Pantry.",
      ],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Segmented"], required: true },
        { allow: ["Pantry"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Segmented" },
        { id: "p1", c: "Pantry" },
        { id: "b1", c: "Button" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

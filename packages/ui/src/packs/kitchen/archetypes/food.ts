import type { ArchetypeMeta } from "../../../catalog";

export const food = {
  id: "food",
  job: "What I ate",
  defaultLayout: "day",
  layouts: {
    day: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Progress"], required: true },
        { allow: ["FoodLog"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "p1", c: "Progress" },
        { id: "f1", c: "FoodLog" },
      ],
    },
    add: {
      writeHints: [
        'List uses style: "inset", with simple food rows, not shelf, expand or ranked. Omit or null photo and body; me is false or null.',
      ],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Search"], required: true },
        { allow: ["List"], required: true, variant: "inset" },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Search" },
        { id: "l1", c: "List", style: "inset" },
        { id: "b1", c: "Button" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

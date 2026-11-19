import { packListDefaults, type ArchetypeMeta } from "../../../catalog";

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
        'Use one List with surface "card", no style or numbered lead, and simple food rows. Omit or null photo and body; me is false or null.',
      ],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Search"], required: true },
        { allow: ["List"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Search" },
        { id: "l1", c: "List", ...packListDefaults["food/add"] },
        { id: "b1", c: "Button" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

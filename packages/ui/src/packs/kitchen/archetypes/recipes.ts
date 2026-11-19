import type { ArchetypeMeta } from "../../../catalog";

export const recipes = {
  id: "recipes",
  job: "My recipe box",
  defaultLayout: "browse",
  layouts: {
    browse: {
      writeHints: [
        'List uses style "cards" for one card per recipe, with no numbered lead. Omit or null body; me is false or null. Photos are optional catalog references such as "lib:food".',
      ],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Search"], required: true },
        { allow: ["Chips"], required: true },
        { allow: ["List"], required: true, variant: "cards" },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Search" },
        { id: "c1", c: "Chips" },
        { id: "l1", c: "List", style: "cards" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

import type { ArchetypeMeta } from "../../../catalog";

export const recipes = {
  id: "recipes",
  job: "My recipe box",
  defaultLayout: "browse",
  layouts: {
    browse: {
      writeHints: [
        'List uses style "cards" for one card per recipe, with no numbered lead. Omit or null body; me is false or null. Photos are optional catalog references such as "lib:food".',
        'When binding named categories to the List, give it an explicit id and use Chips.filter with that id and field:"category". Use style "choose" when there is an explicit All chip: every chip needs view.panel:null and view.empty, with view.match:null for All and an exact row category for the others. For independent filters use style "filter" and real category chips only; no selection means All.',
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

import type { ArchetypeMeta } from "../../../catalog";

export const clients = {
  id: "clients",
  job: "All my clients",
  defaultLayout: "list",
  layouts: {
    list: {
      writeHints: [
        'With supplied client categories, bind Chips.filter to the sibling List’s id and set field:"category". Give each chip a view with panel:null, empty text and an exact category match. For an explicit All chip, use style "choose" and set its match:null. If there are no supplied categories, use top-level filter:null and view:null on every chip.',
      ],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Search"], required: true },
        { allow: ["Chips"], required: true },
        { allow: ["List"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Search" },
        { id: "c1", c: "Chips" },
        { id: "l1", c: "List" },
        { id: "b1", c: "Button" },
      ],
    },
    queue: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Segmented"], required: true },
        { allow: ["FollowUpQueue"], required: true },
        { allow: ["Note"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Segmented" },
        { id: "f1", c: "FollowUpQueue" },
        { id: "n1", c: "Note" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

import type { ArchetypeMeta } from "../../../catalog";

export const clients = {
  id: "clients",
  job: "All my clients",
  defaultLayout: "list",
  layouts: {
    list: {
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

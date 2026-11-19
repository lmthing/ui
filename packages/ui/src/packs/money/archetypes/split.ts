import type { ArchetypeMeta } from "../../../catalog";

export const split = {
  id: "split",
  job: "A shared pot",
  defaultLayout: "group",
  layouts: {
    group: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Split"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Split" },
        { id: "b1", c: "Button" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

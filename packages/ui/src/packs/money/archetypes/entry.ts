import type { ArchetypeMeta } from "../../../catalog";

export const entry = {
  id: "entry",
  job: "Log an expense or income",
  defaultLayout: "quick",
  layouts: {
    quick: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["AmountPad"], required: true },
        { allow: ["Chips"], required: true },
        { allow: ["Field"], required: true, variant: "date" },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "a1", c: "AmountPad" },
        { id: "c1", c: "Chips" },
        { id: "f1", c: "Field", kind: "date" },
        { id: "b1", c: "Button" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

import type { ArchetypeMeta } from "../../../catalog";

export const body_trends = {
  id: "body_trends",
  job: "How my body is changing",
  defaultLayout: "measure",
  layouts: {
    measure: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Measurements"], required: true },
        { allow: ["Stats"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "m1", c: "Measurements" },
        { id: "s1", c: "Stats" },
      ],
    },
    summary: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Segmented"], required: true },
        { allow: ["Bars"], required: true },
        { allow: ["Stats"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Segmented" },
        { id: "b1", c: "Bars" },
        { id: "s2", c: "Stats" },
      ],
    },
    add: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Field"], required: true, variant: "number" },
        { allow: ["Field"], required: true, variant: "date" },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "f1", c: "Field", kind: "number" },
        { id: "f2", c: "Field", kind: "date" },
        { id: "b1", c: "Button" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

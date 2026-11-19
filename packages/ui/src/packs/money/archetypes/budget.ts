import type { ArchetypeMeta } from "../../../catalog";

export const budget = {
  id: "budget",
  job: "This month against the plan",
  defaultLayout: "categories",
  layouts: {
    categories: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Segmented"], required: true },
        { allow: ["Amount"], required: true },
        { allow: ["SectionTitle"], required: true },
        { allow: ["Progress"], required: true },
        { allow: ["SectionTitle"], required: true },
        { allow: ["Progress"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Segmented" },
        { id: "a1", c: "Amount" },
        { id: "s2", c: "SectionTitle" },
        { id: "p1", c: "Progress" },
        { id: "s3", c: "SectionTitle" },
        { id: "p2", c: "Progress" },
      ],
    },
    share: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Segmented"], required: true },
        { allow: ["Bars"], required: true, variant: "share" },
        { allow: ["Bills"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Segmented" },
        { id: "b1", c: "Bars", style: "share" },
        { id: "b2", c: "Bills" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

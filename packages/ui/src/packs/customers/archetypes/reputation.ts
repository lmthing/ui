import type { ArchetypeMeta } from "../../../catalog";

export const reputation = {
  id: "reputation",
  job: "What clients say",
  defaultLayout: "reviews",
  layouts: {
    reviews: {
      writeHints: [
        "Put the summary first and the review list after SectionTitle; the two reviews must not touch.",
      ],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Review"], required: true, variant: "summary" },
        { allow: ["SectionTitle"], required: true },
        { allow: ["Review"], required: true, variant: "list" },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "r1", c: "Review", style: "summary" },
        { id: "s1", c: "SectionTitle" },
        { id: "r2", c: "Review", style: "list" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

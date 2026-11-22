import type { ArchetypeMeta } from "../../../catalog";

export const reputation = {
  id: "reputation",
  job: "What clients say",
  defaultLayout: "reviews",
  layouts: {
    reviews: {
      writeHints: [
        'After Header, write Review with style "summary", then SectionTitle, then Review with style "list". Keep detail null unless requested.',
        "The summary must include numeric average and count and exactly five numeric bars, ordered from one to five stars. The list must include one to five reviews, each with stars, name, date and text. Never use null for these active fields. Use null for reviews in the summary and for average, count and bars in the list.",
        'Use supplied reviews and rating facts when present. If no reviews or rating facts are supplied, copy the neutral values from "A valid default for this layout": average 0, count 0, bars [0,0,0,0,0] for the summary and the existing single placeholder review for the list. These values are the empty-data preview, not invented customer feedback.',
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

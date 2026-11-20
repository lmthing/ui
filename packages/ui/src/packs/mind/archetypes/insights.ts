import type { ArchetypeMeta } from "../../../catalog";

export const insights = {
  id: "insights",
  job: "See what I have learned about my mood and sleep",
  defaultLayout: "week",
  layouts: {
    week: {
      writeHints: [
        "When no sleep history is supplied, use the default's neutral 00:00 times with empty state and omit all optional sleep values. Patterns names factors to compare, not results.",
      ],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["SleepLog"], required: true },
        { allow: ["Patterns"], required: true },
        { allow: ["Stats"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "SleepLog" },
        { id: "p1", c: "Patterns" },
        { id: "s2", c: "Stats" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

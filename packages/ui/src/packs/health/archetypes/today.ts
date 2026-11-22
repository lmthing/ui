import type { ArchetypeMeta } from "../../../catalog";

export const today = {
  id: "today",
  job: "My health today",
  defaultLayout: "rings",
  layouts: {
    rings: {
      writeHints: [
        "Use ordinary ActivityRings with null style and score unless the person's data includes a headline score plus three distinct factors. Do not invent a readiness or bio-age score.",
      ],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["ActivityRings"], required: true },
        { allow: ["HabitGrid"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "a1", c: "ActivityRings" },
        { id: "h2", c: "HabitGrid" },
      ],
    },
    meds: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Medication"], required: true },
        { allow: ["Streak"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "m1", c: "Medication" },
        { id: "s1", c: "Streak" },
        { id: "b1", c: "Button" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

import type { ArchetypeMeta } from "../../../catalog";

export const bodylog = {
  id: "bodylog",
  job: "Log how my body is",
  defaultLayout: "symptoms",
  layouts: {
    symptoms: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Scale"], required: true, variant: "mood" },
        { allow: ["SymptomLog"], required: true },
        { allow: ["Composer"], required: true, variant: "entry" },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Scale", style: "mood" },
        { id: "s2", c: "SymptomLog" },
        { id: "c1", c: "Composer", style: "entry" },
        { id: "b1", c: "Button" },
      ],
    },
    vitals: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Vitals"], required: true },
        { allow: ["Note"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "v1", c: "Vitals" },
        { id: "n1", c: "Note" },
      ],
    },
    cycle: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Cycle"], required: true },
        { allow: ["Calendar"], required: true, variant: "month" },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "c1", c: "Cycle" },
        { id: "c2", c: "Calendar", style: "month" },
      ],
    },
    med_edit: {
      writeHints: [
        'The recurring Field uses kind: "repeat" and repeat: "daily"; omit value and options on it.',
      ],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Field"], required: true },
        { allow: ["Field"], required: true, variant: "time" },
        { allow: ["Field"], required: true, variant: "repeat" },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "f1", c: "Field" },
        { id: "f2", c: "Field", kind: "time" },
        { id: "f3", c: "Field", kind: "repeat" },
        { id: "b1", c: "Button" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

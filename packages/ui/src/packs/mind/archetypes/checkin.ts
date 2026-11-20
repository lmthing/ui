import type { ArchetypeMeta } from "../../../catalog";

export const checkin = {
  id: "checkin",
  job: "Check in with how I feel today",
  defaultLayout: "quick",
  layouts: {
    quick: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Scale"], required: true, variant: "mood" },
        { allow: ["Factors"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Scale", style: "mood" },
        { id: "f1", c: "Factors" },
        { id: "b1", c: "Button" },
      ],
    },
    full: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Scale"], required: true, variant: "mood" },
        { allow: ["Feelings"], required: true },
        { allow: ["Factors"], required: true },
        { allow: ["Composer"], required: true, variant: "entry" },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Scale", style: "mood" },
        { id: "f1", c: "Feelings" },
        { id: "f2", c: "Factors" },
        { id: "c1", c: "Composer", style: "entry" },
        { id: "b1", c: "Button" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

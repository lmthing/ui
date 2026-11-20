import type { ArchetypeMeta } from "../../../catalog";

export const settle = {
  id: "settle",
  job: "Settle down now",
  defaultLayout: "breathe",
  layouts: {
    breathe: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Breathe"], required: true },
        { allow: ["Note"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "b1", c: "Breathe" },
        { id: "n1", c: "Note" },
      ],
    },
    sounds: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Soundscape"], required: true },
        { allow: ["Note"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Soundscape" },
        { id: "n1", c: "Note" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

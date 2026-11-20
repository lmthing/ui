import type { ArchetypeOverrides } from "../../../catalog";

export { checkin } from "./checkin";
export { settle } from "./settle";
export { insights } from "./insights";
export { sleep } from "./sleep";

export const archetypeOverrides = {
  journal: {
    entries: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Streak"], required: true },
        { allow: ["Entries"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Streak" },
        { id: "e1", c: "Entries" },
        { id: "b1", c: "Button" },
      ],
    },
    month: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Calendar"], required: true, variant: "month" },
        { allow: ["Entries"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "c1", c: "Calendar", style: "month" },
        { id: "e1", c: "Entries" },
      ],
    },
  },
} as const satisfies ArchetypeOverrides;

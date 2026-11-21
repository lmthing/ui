import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const swap = {
  id: "swap",
  job: "Keep or skip offers one at a time",
  defaultLayout: "deck",
  layouts: {
    deck: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["SwipeStack"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "SwipeStack" },
        { id: "b1", c: "Button" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "swap",
    layout: "deck",
    brief:
      "Cutting swap title, a deck of fern and basil photo offers to swipe one at a time to keep or skip, and one button to see saved offers.",
  },
] satisfies ComposeProbe[];

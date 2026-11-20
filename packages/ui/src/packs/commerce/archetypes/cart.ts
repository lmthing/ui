import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const cart = {
  id: "cart",
  job: "Review the basket before purchase",
  defaultLayout: "simple",
  layouts: {
    simple: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Cart"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "c1", c: "Cart" },
        { id: "b1", c: "Button" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "cart",
    layout: "simple",
    brief: "See the items and editable quantities in the basket, and continue to checkout.",
  },
] satisfies ComposeProbe[];

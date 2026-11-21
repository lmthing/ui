import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const board = {
  id: "board",
  job: "See and move work by stage",
  defaultLayout: "kanban",
  layouts: {
    kanban: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["FilterBar"], required: true },
        { allow: ["Board"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "f1", c: "FilterBar" },
        { id: "b1", c: "Board" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "board",
    layout: "kanban",
    brief:
      "Start with Reorder workflow, then a Find reorders search with a Supplier dropdown (Green Lane, Cedar Mill). Draw the movable cards in Requested, Ordered and Received columns. Put Seed trays in Requested with a link to trays; put Trowels in Ordered with a link to trowels.",
  },
] satisfies ComposeProbe[];

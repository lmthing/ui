import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const trips_all = {
  id: "trips_all",
  job: "All my trips",
  defaultLayout: "list",
  layouts: {
    list: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["List"], required: true, variant: "cards" },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "l1", c: "List", style: "cards" },
        { id: "b1", c: "Button" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "trips_all",
    layout: "list",
    brief: "My trips, with photo cards for Japan and Portugal and one button to add a trip.",
  },
] satisfies ComposeProbe[];

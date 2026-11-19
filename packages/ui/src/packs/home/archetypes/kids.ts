import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const kids = {
  id: "kids",
  job: "Points and prizes",
  defaultLayout: "jar",
  layouts: {
    jar: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Rewards"], required: true },
        { allow: ["Chores"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "r1", c: "Rewards" },
        { id: "c1", c: "Chores" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;
export const probes = [
  {
    kind: "compose",
    archetype: "kids",
    layout: "jar",
    brief: "Children's points, prize costs and chores that earn points",
  },
] satisfies ComposeProbe[];

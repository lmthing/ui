import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const baby = {
  id: "baby",
  job: "The baby's day",
  defaultLayout: "today",
  layouts: {
    today: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["BabyLog"], required: true },
        { allow: ["Stats"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "b1", c: "BabyLog" },
        { id: "s1", c: "Stats" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;
export const probes = [
  {
    kind: "compose",
    archetype: "baby",
    layout: "today",
    brief: "Quick baby feeding and sleep logging with today's summary",
  },
] satisfies ComposeProbe[];

import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const family = {
  id: "family",
  job: "The household this week",
  defaultLayout: "board",
  layouts: {
    board: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["People"], required: true, variant: "stack" },
        { allow: ["Chores"], required: true },
        { allow: ["Turns"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "p1", c: "People", style: "stack" },
        { id: "c1", c: "Chores" },
        { id: "t1", c: "Turns" },
      ],
    },
    agenda: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Calendar"], required: true, variant: "week" },
        { allow: ["Agenda"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "c1", c: "Calendar", style: "week" },
        { id: "a1", c: "Agenda" },
      ],
    },
    leaders: {
      writeHints: [
        'List uses style:"ranked", 1–6 rows with short titles. Do not write points totals computed from chore data.',
      ],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Segmented"], required: true },
        { allow: ["List"], required: true, variant: "ranked" },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "Segmented" },
        { id: "l1", c: "List", style: "ranked" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;
export const probes = [
  {
    kind: "compose",
    archetype: "family",
    layout: "board",
    brief: "The household's people, shared chores and whose turn it is",
  },
  {
    kind: "compose",
    archetype: "family",
    layout: "agenda",
    brief: "The family's week and upcoming events by day",
  },
  {
    kind: "compose",
    archetype: "family",
    layout: "leaders",
    brief: "Rank household members with a period selector",
  },
] satisfies ComposeProbe[];

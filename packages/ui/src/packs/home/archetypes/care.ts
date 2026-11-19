import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const care = {
  id: "care",
  job: "Looking after a thing",
  defaultLayout: "subject",
  layouts: {
    subject: {
      writeHints: [
        'Timeline uses style:"history". Its 1–6 rows have time and title; never write end, tone or goto, which belong only to hours.',
      ],
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["Profile"], required: true },
        { allow: ["KeyValue"], required: true },
        { allow: ["CareSchedule"], required: true },
        { allow: ["Timeline"], required: true, variant: "history" },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "p1", c: "Profile" },
        { id: "k1", c: "KeyValue" },
        { id: "c1", c: "CareSchedule" },
        { id: "t1", c: "Timeline", style: "history" },
      ],
    },
    all: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Chips"], required: true },
        { allow: ["CareSchedule"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "c1", c: "Chips" },
        { id: "c2", c: "CareSchedule" },
      ],
    },
    photo: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Camera"], required: true },
        { allow: ["Note"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "c1", c: "Camera" },
        { id: "n1", c: "Note" },
        { id: "b1", c: "Button" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;
export const probes = [
  {
    kind: "compose",
    archetype: "care",
    layout: "subject",
    brief: "One plant's identity, facts, recurring care and care history",
  },
  { kind: "compose", archetype: "care", layout: "all", brief: "All recurring care tasks with a filter" },
  { kind: "compose", archetype: "care", layout: "photo", brief: "Take a care photo with a note and save it" },
] satisfies ComposeProbe[];

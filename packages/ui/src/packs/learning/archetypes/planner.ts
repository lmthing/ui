import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const planner = {
  id: "planner",
  job: "See this week’s classes and homework",
  defaultLayout: "week",
  layouts: {
    week: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Timetable"], required: true },
        { allow: ["SectionTitle"], required: true },
        { allow: ["Assignments"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "t1", c: "Timetable" },
        { id: "s1", c: "SectionTitle" },
        { id: "a1", c: "Assignments" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "planner",
    layout: "week",
    brief:
      "Show Japanese Mondays at 09:00 in B12 with Ms Tanaka, followed by homework: Water radical worksheet due on 2026-11-25, still to do, linked to worksheet.",
  },
] satisfies ComposeProbe[];

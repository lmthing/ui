import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const cup = {
  id: "cup",
  job: "A tournament",
  defaultLayout: "bracket",
  layouts: {
    bracket: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Bracket"], required: true },
        { allow: ["Fixtures"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "b1", c: "Bracket" },
        { id: "f1", c: "Fixtures" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "cup",
    layout: "bracket",
    brief:
      "Sunday Cup heading, then a knockout bracket with two semifinal results: Sunday Kickers 2–1 Fern House and River Rovers 3–0 Oakfield. Show the unplayed final between Kickers and River Rovers and highlight Sunday Kickers. Below, list the final fixture at home against River Rovers on 2026-11-29 at 10:00 at Mill Field, link to cup_final.",
  },
] satisfies ComposeProbe[];

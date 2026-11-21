import type { ArchetypeMeta, ComposeProbe } from "../../../catalog";

export const match = {
  id: "match",
  job: "One match",
  defaultLayout: "live",
  layouts: {
    live: {
      writeHints: [
        "Each seeded score must equal its side's count of goal events. Keep goal events even when another incident is more recent.",
      ],
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["Scoreboard"], required: true },
        { allow: ["MatchFeed"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "s1", c: "Scoreboard" },
        { id: "m1", c: "MatchFeed" },
      ],
    },
    lineup: {
      recipe: [
        { allow: ["Header"], required: true, variant: "back" },
        { allow: ["Scoreboard"], required: true },
        { allow: ["Lineup"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header", style: "back" },
        { id: "s1", c: "Scoreboard" },
        { id: "l1", c: "Lineup" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

export const probes = [
  {
    kind: "compose",
    archetype: "match",
    layout: "live",
    brief:
      "Open with a Match day back heading. Let the scorekeeper keep a first-half live score of Sunday Kickers 1–0 River Rovers, with controls for both sides. The newest incident is Reed's home goal in minute 8; River's Banks received a yellow card in minute 5.",
  },
  {
    kind: "compose",
    archetype: "match",
    layout: "lineup",
    brief:
      "Match lineup back heading, then the pre-match display score (Sunday Kickers 0–0 River Rovers). Draw the starting formation on the pitch: keeper 1 Gardner, next line 4 Green and 8 Field, front line 10 Reed and 11 Woods, with 14 Moss on the bench.",
  },
] satisfies ComposeProbe[];

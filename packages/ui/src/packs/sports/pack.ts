import type { PackMeta } from "../../catalog";

export const pack = {
  id: "sports",
  example:
    "Sunday Kickers arrange five-a-side fixtures, collect availability, keep live scores and follow their league and cup.",
  probes: [
    {
      kind: "pack",
      idea: "An amateur football club tracks fixtures, player availability, match lineups and its league table.",
      expect: ["sports"],
    },
    {
      kind: "pack",
      idea: "A school hockey tournament records match scores and shows teams advancing through a knockout bracket.",
      expect: ["sports"],
    },
    {
      kind: "pack",
      idea: "A private gym workout log for sets, repetitions and rest timers. There are no teams, matches, scores or fixtures.",
      expect: ["health"],
    },
    {
      kind: "choose",
      need: "Show a ranked list of player names with one goals tally each. No match results, head-to-head rounds, or league table columns.",
      expect: "List",
    },
  ],
} as const satisfies PackMeta;

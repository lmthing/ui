import type { PackMeta } from "../../catalog";

export const pack = {
  id: "play",
  example: "Table Night splits six players into teams, tracks turns and scores, and hosts trivia.",
  probes: [
    {
      kind: "pack",
      idea: "A board-game night around one phone: roll dice, draw random challenges and enter each team's round scores. No league or household jobs.",
      expect: ["play"],
    },
    {
      kind: "pack",
      idea: "Host a pub quiz around one phone: read questions aloud, reveal answers and randomly split players into teams. No graded submissions or lessons.",
      expect: ["play"],
    },
    {
      kind: "pack",
      idea: "Run a football league's fixtures, match scores and season standings. No party or board games.",
      expect: ["sports"],
    },
    {
      kind: "choose",
      need: "Keep just one running score with plus and minus buttons. No players, rounds, random draws or score matrix.",
      expect: "Counter",
    },
  ],
} as const satisfies PackMeta;

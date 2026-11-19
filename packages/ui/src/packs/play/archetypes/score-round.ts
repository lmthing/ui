import type { ArchetypeMeta } from "../../../catalog";

export const score_round = {
  id: "score_round",
  job: "Enter rounds and see the result",
  defaultLayout: "play_scores",
  layouts: {
    play_scores: {
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["ScoreSheet"], required: true },
        { allow: ["Note"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "ScoreSheet" },
        { id: "n1", c: "Note" },
      ],
    },
    play_results: {
      writeHints: [
        'Use List style "ranked": each row has a short title and score value, trail "value"; no body, photo or goto. Results read the same score record as round entry, preserving tied totals. Do not invent independent totals.',
      ],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["List"], required: true, variant: "ranked" },
        { allow: ["Note"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "l1", c: "List", style: "ranked" },
        { id: "n1", c: "Note" },
        { id: "b1", c: "Button" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

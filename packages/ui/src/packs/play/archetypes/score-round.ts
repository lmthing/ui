import { packListDefaults, type ArchetypeMeta } from "../../../catalog";

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
        'Use List with lead "number", trail "value" and no style. Each row has a short title and a score value; no body, photo or goto. Results read the same score record as round entry, preserving tied totals. Do not invent independent totals.',
      ],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["List"], required: true },
        { allow: ["Note"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "l1", c: "List", ...packListDefaults["score_round/play_results"] },
        { id: "n1", c: "Note" },
        { id: "b1", c: "Button" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

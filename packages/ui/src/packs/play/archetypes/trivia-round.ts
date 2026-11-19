import type { ArchetypeMeta } from "../../../catalog";

export const trivia_round = {
  id: "trivia_round",
  job: "Host a question, reveal and score it",
  defaultLayout: "play_question",
  layouts: {
    play_question: {
      writeHints: [
        'Timer uses style "down" and seconds 30, never at or a running/progress prop. Trivia holds seed questions and hidden answers, not submissions or awarded scores.',
      ],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["Timer"], required: true, variant: "down" },
        { allow: ["Trivia"], required: true },
        { allow: ["Note"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "t1", c: "Timer", style: "down", seconds: 30 },
        { id: "t2", c: "Trivia" },
        { id: "n1", c: "Note" },
      ],
    },
    play_awards: {
      writeHints: [
        'ScoreSheet uses style "round" with one integer or null per player in each round. Awarded round points are raw score records; never write computed totals, ranks or winners.',
      ],
      recipe: [
        { allow: ["Header"], required: true },
        { allow: ["ScoreSheet"], required: true, variant: "round" },
        { allow: ["Note"], required: true },
        { allow: ["Button"], required: true },
      ],
      defaults: [
        { id: "h1", c: "Header" },
        { id: "s1", c: "ScoreSheet", style: "round" },
        { id: "n1", c: "Note" },
        { id: "b1", c: "Button" },
      ],
    },
  },
} as const satisfies ArchetypeMeta;

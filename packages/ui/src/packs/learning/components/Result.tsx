import { z } from "zod";
import * as c from "../../../catalog";

// Core first: Stats/default cannot show a practice score with corrections and review or retry controls.
export const meta = {
  id: "Result",
  status: "draft",
  group: "data",
  purpose: "See a practice score and review the mistakes before trying again.",
  pick: "A finished quiz or practice outcome: score, time, points, mistakes to review and a retry. Not independent summary numbers (Stats), a goal (Ring), confirmation (Success) or a sports score (Scoreboard).",
  writeHints: [
    "Write right and of as counts, not a percentage. Do not write a wrong count or score label. Include only supplied mistakes, never more than of minus right.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Results are stored on the device.",
  variants: { surface: ["card", "outlined"], emphasis: ["hero", "normal"] },
  parts: ["root", "score", "right", "wrong", "seconds", "points", "review", "again"],
  items: { key: "mistakes", parts: ["root", "question", "answer"] },
  states: ["filled", "success"],
  actions: { parts: { review: ["press"], again: ["press"] }, when: { review: { has_mistakes: true } } },
  successActions: ["again.press"],
  read: (input, _state, lang): string[] => {
    const { right, of, seconds, points } = input as z.output<typeof props>;
    return [
      c.stampLine(right, of, lang),
      ...(seconds === undefined ? [] : [c.clockLine(seconds, lang)]),
      ...(points === undefined ? [] : [c.numberLine(points, lang)]),
    ];
  },
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    right: z.int().min(0).max(10000),
    of: z.int().min(1).max(10000),
    seconds: z.int().min(0).max(86400).optional(),
    points: z.int().min(0).max(1000000).optional(),
    mistakes: z
      .array(z.strictObject({ question: c.text(60), answer: c.text(40) }))
      .min(0)
      .max(5),
  })
  .refine(({ right, of }) => right <= of, { path: ["right"] })
  .refine(({ right, of, mistakes }) => mistakes.length <= of - right, { path: ["mistakes"] })
  .overwrite((value) => ({ ...value, has_mistakes: value.mistakes.length > 0 }));

export function fallback(_input: c.FallbackInput): z.input<typeof props> {
  return { right: 0, of: 1, mistakes: [] };
}

export const examples = [
  {
    right: 9,
    of: 10,
    seconds: 92,
    points: 90,
    mistakes: [{ question: "Which part of a fern takes up water?", answer: "Roots" }],
  },
  // Trot's walking-kit practice passed without mistakes.
  { surface: "outlined", emphasis: "normal", right: 5, of: 5, mistakes: [] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Result");
export const probes = [
  choose(
    "After my language drill, show the score, right and wrong counts, time taken and corrections with a way to retry.",
  ),
  choose(
    "Put three separate totals side by side: courses enrolled, notes saved and study hours. No grade, corrections or retry.",
    "Stats",
  ),
  write(
    "Show a kanji practice outcome: 9 correct of 10, 92 seconds, 90 points. One mistake: the reading of 川 is kawa.",
  ),
  read("Review the mistakes from this attempt.", { address: "r1/review", action: "press" }),
] satisfies c.Probe[];

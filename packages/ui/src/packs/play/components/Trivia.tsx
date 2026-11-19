import { z } from "zod";
import {
  detailOf,
  itemsOf,
  photo,
  placeholderDetail,
  placeholderTitle,
  probesFor,
  text,
  thingOf,
  titleOf,
  type CastLike,
  type Meta,
  type Probe,
} from "../../../catalog";

// Core first: Choice/default cannot run a host-led question/reveal sequence without grading submissions.
export const meta = {
  id: "Trivia",
  status: "draft",
  group: "content",
  purpose: "Host questions aloud, reveal answers and advance without grading submitted responses.",
  pick: "Host-controlled question and answer reveals for players answering aloud or on paper. Not private option selection (Choice), graded submissions (Quiz), or spaced recall (Flashcard).",
  writeHints: [
    "Write seed question, answer, optional explanation/photo and points. Never write submissions, grades, awarded scores, current index or reveal state.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  confirmParts: ["restart"],
  realPath: "A local deck uses host-controlled reveals; awarded points are recorded separately.",
  parts: ["root", "question", "answer", "explain", "photo", "points", "reveal", "next", "restart"],
  states: ["filled", "loading", "success", "empty"],
  actions: { parts: { reveal: ["press"], next: ["press"], restart: ["press"] } },
  // The seed deck is not an item list: unrevealed answers never enter the reading.
  read: (input) => {
    const question = (input as z.output<typeof props>).questions[0];
    return question ? [question.question, String(question.points)] : [];
  },
} as const satisfies Meta;
export const props = z.strictObject({
  questions: z
    .array(
      z.strictObject({
        question: text(120),
        answer: text(120),
        explain: text(160).optional(),
        photo: photo.optional(),
        points: z.int().min(1).max(20).default(1),
      }),
    )
    .min(1)
    .max(6),
  style: z.enum(["card", "large"]).default("card"),
});
export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const thing = thingOf(cast);
  const questions = itemsOf(cast, 3).map((item, index) => ({
    question: titleOf(item, 120, thing) ?? placeholderTitle(index),
    answer: detailOf(item, 120, thing) ?? placeholderDetail,
  }));
  return {
    questions: questions.length ? questions : [{ question: placeholderTitle(0), answer: placeholderDetail }],
  };
}
export const examples = [
  // Ledge's host reads a plant question.
  {
    questions: [
      {
        question: "Which part takes up water?",
        answer: "Roots",
        explain: "Roots absorb water from the soil.",
        photo: "lib:plants",
        points: 2,
      },
      { question: "What gives leaves their green colour?", answer: "Chlorophyll" },
    ],
    style: "card",
  },
  // Trot's walkers host a question aloud after their round.
  { questions: [{ question: "How many legs does a dog have?", answer: "Four", points: 1 }], style: "large" },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("Trivia");
export const probes = [
  choose(
    "Read a pub-quiz question aloud, reveal its answer on the host's phone, then advance; no graded submissions",
  ),
  choose(
    "Privately pick one answer from three options, each with an explanation; no host or reveal sequence",
    "Choice",
  ),
  write(
    "Host two questions aloud: Which part takes up water? Roots, worth two points. What makes leaves green? Chlorophyll, worth one. Large question style.",
  ),
  read("Reveal the answer to the current question", { address: "t1/reveal", action: "press" }),
  read("Restart the question deck", { address: "t1/restart", action: "press" }),
] satisfies Probe[];

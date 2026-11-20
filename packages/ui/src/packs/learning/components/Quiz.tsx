import { z } from "zod";
import * as c from "../../../catalog";

// Core first: Choice/cards cannot check a correct answer, explain mistakes or advance through questions.
export const meta = {
  id: "Quiz",
  status: "draft",
  group: "input",
  purpose: "Practise one question at a time and get feedback after checking each answer.",
  pick: "Assessed practice questions with correct answers and immediate feedback. Use for multiple choice, true or false, typed recall or matching pairs. Not choosing a preference (Choice), a vote (Poll), or self-rated recall (Flashcard).",
  writeHints: [
    "Write only the fields for each kind: choice uses 2–5 options and a zero-based answer index; truefalse uses a boolean answer; type uses a text answer; match uses 3–5 correct left/right pairs and no answer field.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Questions are stored with the app and answers are checked on the device.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"] },
  parts: ["root", "question", "photo", "field", "left", "right", "check", "next", "answer", "explain"],
  states: ["filled", "success", "error"],
  actions: {
    parts: {
      root: ["select"],
      field: ["type"],
      left: ["select"],
      right: ["select"],
      check: ["press"],
      next: ["press"],
    },
    when: {
      "root.select": { has_options: true },
      field: { kind: "type" },
      left: { kind: "match" },
      right: { kind: "match" },
      next: { checked: true },
      check: { checked: false },
    },
  },
  successActions: ["next.press"],
  read: (input): string[] => {
    const {
      questions: [question],
    } = input as z.output<typeof props>;
    if (!question) return [];
    const options =
      question.kind === "choice"
        ? question.options
        : question.kind === "match"
          ? [
              question.pairs.map(({ left }) => left).join(" · "),
              question.pairs
                .map(({ right }) => right)
                .sort()
                .join(" · "),
            ]
          : [];
    return [
      question.question,
      ...options,
      ...(question.photo ? [`photo:${question.photo.replace(/^lib:/, "")}`] : []),
    ];
  },
} as const satisfies c.Meta;

const common = { question: c.text(120), explain: c.text(200).optional(), photo: c.photo.optional() };
const question = z.discriminatedUnion("kind", [
  z
    .strictObject({
      ...common,
      kind: z.literal("choice"),
      options: z.array(c.text(40)).min(2).max(5),
      answer: z.int().min(0).max(4),
    })
    .refine(({ answer, options }) => answer < options.length, { path: ["answer"] }),
  z.strictObject({ ...common, kind: z.literal("truefalse"), answer: z.boolean() }),
  z.strictObject({ ...common, kind: z.literal("type"), answer: c.text(40) }),
  z.strictObject({
    ...common,
    kind: z.literal("match"),
    pairs: z
      .array(z.strictObject({ left: c.text(20), right: c.text(20) }))
      .min(3)
      .max(5),
  }),
]);

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    questions: z.array(question).min(1).max(6),
  })
  .overwrite((value) => {
    const kind = value.questions[0]?.kind;
    // Derived reader/action conditions, never model-written fields.
    return { ...value, kind, has_options: kind === "choice" || kind === "truefalse", checked: false };
  });

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const items = c.itemsOf(cast, 3);
  return {
    questions: Array.from({ length: Math.max(1, items.length) }, (_, index) => {
      const item = items[index];
      return {
        kind: "type",
        question: (item && c.titleOf(item, 120, thing)) ?? c.placeholderTitle(index, lang),
        answer: (item && c.detailOf(item, 40, thing)) ?? c.clip(c.wordsFor(lang).placeholderDetail, 40),
      };
    }),
  };
}

export const examples = [
  {
    questions: [
      {
        question: "Which reading means water?",
        kind: "choice",
        options: ["mizu", "yama", "kawa"],
        answer: 0,
        explain: "Mizu is the common reading of 水.",
        photo: "lib:ocean",
      },
      { question: "Type the reading of 川.", kind: "type", answer: "kawa" },
    ],
  },
  {
    density: "compact",
    surface: "outlined",
    questions: [
      { question: "Does G major have one sharp?", kind: "truefalse", answer: true },
      {
        question: "Match each key to its relative minor.",
        kind: "match",
        pairs: [
          { left: "C major", right: "A minor" },
          { left: "G major", right: "E minor" },
          { left: "F major", right: "D minor" },
        ],
      },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Quiz");
export const probes = [
  choose(
    "Ask me graded practice questions one at a time. Check each submission and explain the right answer before moving on.",
  ),
  choose(
    "Let me pick one of three study plans, each with an explanatory sentence. None is right or wrong.",
    "Choice",
  ),
  write(
    "Ask which reading means water: mizu, yama or kawa. The first option is correct. Then ask me to type the reading of 川, which is kawa.",
  ),
  read("Check my answer to the current question.", { address: "q1/check", action: "press" }),
] satisfies c.Probe[];

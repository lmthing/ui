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
    "Use null for unused fields. For choice, write 2–5 options and a zero-based answer index. For truefalse, write a boolean answer. For type, write a text answer. For match, write 3–5 correct left/right pairs and set answer to null.",
    "Leave selected_option, selected_left and selected_right null; selections are made by the learner.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Questions are stored with the app and answers are checked on the device.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"] },
  parts: ["root", "question", "photo", "field", "left", "right", "check", "next", "answer", "explain"],
  states: ["filled", "success", "error"],
  selections: {
    root: { prop: "selected_option", choices: { prop: "option_indexes" } },
    left: { prop: "selected_left", choices: { prop: "match_indexes" } },
    right: { prop: "selected_right", choices: { prop: "match_indexes" } },
  },
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
      field: { kind: "type" },
      right: { has_left: true },
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
        ? (question.options ?? [])
        : question.kind === "truefalse"
          ? [String(true), String(false)]
          : question.pairs
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

// The strict Writer requires object keys and represents absent optional fields as null.
const optionIndex = z.int().min(0).max(4);
const question = z
  .strictObject({
    question: c.text(120),
    kind: z.enum(["choice", "truefalse", "type", "match"]),
    explain: c.text(200).optional(),
    photo: c.photo.optional(),
    options: z.array(c.text(40)).min(2).max(5).optional(),
    answer: z.union([optionIndex, z.boolean(), c.text(40)]).optional(),
    pairs: z
      .array(z.strictObject({ left: c.text(20), right: c.text(20) }))
      .min(3)
      .max(5)
      .optional(),
  })
  .refine(({ kind, options }) => (kind === "choice") === (options !== undefined), { path: ["options"] })
  .refine(({ kind, pairs }) => (kind === "match") === (pairs !== undefined), { path: ["pairs"] })
  .refine(
    ({ kind, options, answer }) => {
      if (kind === "choice") return typeof answer === "number" && answer < (options?.length ?? 0);
      if (kind === "truefalse") return typeof answer === "boolean";
      if (kind === "type") return typeof answer === "string";
      return answer === undefined;
    },
    { path: ["answer"] },
  );

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    questions: z.array(question).min(1).max(6),
    selected_option: optionIndex.optional(),
    selected_left: optionIndex.optional(),
    selected_right: optionIndex.optional(),
  })
  .overwrite((value) => {
    const first = value.questions[0];
    const kind = first?.kind;
    const option_indexes = kind === "truefalse" ? [0, 1] : (first?.options?.map((_, i) => i) ?? []);
    const match_indexes = first?.pairs?.map((_, i) => i) ?? [];
    const from = (index: number | undefined, choices: number[]) =>
      index !== undefined && choices.includes(index) ? index : undefined;
    const selected_left = from(value.selected_left, match_indexes);
    // Initial session conditions. A checked result and the next question need runtime projection.
    return {
      ...value,
      kind,
      checked: false,
      has_left: selected_left !== undefined,
      option_indexes,
      match_indexes,
      selected_option: from(value.selected_option, option_indexes),
      selected_left,
      selected_right: selected_left === undefined ? undefined : from(value.selected_right, match_indexes),
    };
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

import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
// prettier-ignore
import {
  gradeQuiz, previewQuizSteps, projectQuiz, quizChoices, quizKey, quizMatches, quizProgress, quizSolution, readQuiz,
  reviseQuiz, type QuizItem, type QuizRound,
} from "../copy";
import { learningWordsFor } from "../lang";

// Core first: Choice/cards cannot check a correct answer, explain mistakes or advance through questions.
// prettier-ignore
export const meta = {
  id: "Quiz", status: "ready", group: "input",
  purpose: "Practise one question at a time and get feedback after checking each answer.",
  pick: "Assessed practice questions with correct answers and immediate feedback. Use for multiple choice, true or false, typed recall or matching pairs. Not choosing a preference (Choice), a vote (Poll), or self-rated recall (Flashcard).",
  writeHints: [
    "Use null for unused fields. For choice, write 2–5 options and a zero-based answer index. For truefalse, write a boolean answer. For type, write a text answer. For match, write 3–5 correct left/right pairs and set answer to null.",
    "Leave selected_option, selected_left and selected_right null; selections are made by the learner.",
    'When asked to hide the question photo, write media "none" and retain its photo reference. Always write density and surface as null unless requested; do not fill in defaults such as "comfortable" or "card". Use media null for unrequested media.',
  ],
  region: "body", weight: 2, tier: "phone",
  realPath: "Questions are stored with the app and answers are checked on the device.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"], media: ["thumb", "none"] },
  variantParts: { "media.none": { hides: ["photo"] } },
  parts: ["root", "panel", "progress", "question", "photo", "field", "left", "right", "check", "next", "answer", "explain", "feedback", "score"],
  states: ["filled", "success", "error"],
  selections: {
    root: { prop: "selected_option", choices: { prop: "option_indexes" } },
    left: { prop: "selected_left", choices: { prop: "match_indexes" } },
    right: { prop: "selected_right", choices: { prop: "right_indexes" } },
  },
  actions: {
    parts: { root: ["select"], field: ["type"], left: ["select"], right: ["select"], check: ["press"], next: ["press"] },
    when: { field: { kind: "type" }, right: { has_left: true }, next: { checked: true }, check: { checked: false } },
  },
  successActions: ["next.press"],
  session: {
    kind: "rounds", items: "questions", hidden: ["answer", "explain"], reveal: "check", next: "next",
    assessment: {
      inputs: { root: "select", field: "type", left: "select", right: "select" },
      readHidden: ["answer"], project: projectQuiz, grade: gradeQuiz, revise: reviseQuiz,
    },
  },
  read: readQuiz,
} as const satisfies c.Meta;

// The strict Writer requires object keys and represents absent optional fields as null.
const optionIndex = z.int().min(0).max(4);
// prettier-ignore
const question = z.strictObject({
  question: c.text(120), kind: z.enum(["choice", "truefalse", "type", "match"]),
  explain: c.text(200).optional(), photo: c.photo.optional(),
  options: z.array(c.text(40)).min(2).max(5).optional(),
  answer: z.union([optionIndex, z.boolean(), c.text(40)]).optional(),
  pairs: z.array(z.strictObject({ left: c.text(20), right: c.text(20) })).min(3).max(5).optional(),
})
  .refine(({ kind, options }) => (kind === "choice") === (options !== undefined), { path: ["options"] })
  .refine(({ kind, pairs }) => (kind === "match") === (pairs !== undefined), { path: ["pairs"] })
  .refine(({ kind, options, answer }) => {
    if (kind === "choice") return typeof answer === "number" && answer < (options?.length ?? 0);
    if (kind === "truefalse") return typeof answer === "boolean";
    if (kind === "type") return typeof answer === "string";
    return answer === undefined;
  }, { path: ["answer"] });
// prettier-ignore
export const props = z.strictObject({
  ...c.variantProps(meta.variants), questions: z.array(question).min(1).max(6),
  selected_option: optionIndex.optional(), selected_left: optionIndex.optional(), selected_right: optionIndex.optional(),
}).overwrite((value) => value.media === "none"
  ? { ...value, questions: value.questions.map((item) => ({ ...item, photo: undefined })) } : value);

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

// prettier-ignore
const choice = {
  question: "What absorbs water?", kind: "choice", options: ["Roots", "Fronds", "Spores"],
  answer: 0, explain: "Roots take up water and minerals from the soil.", photo: "lib:plants",
} satisfies z.input<typeof question>;
const typed = { question: "Name the fern's leaves.", kind: "type", answer: "Fronds" } as const;
// prettier-ignore
const match = {
  question: "Match the walking kit.", kind: "match",
  pairs: [{ left: "Lead", right: "Stay close" }, { left: "Bottle", right: "Give water" },
    { left: "Bags", right: "Clean up" }],
} satisfies z.input<typeof question>;
// prettier-ignore
export const examples = [
  { questions: [choice, typed] },
  { questions: [
    { question: "Do dogs need water on long\u00a0walks?", kind: "truefalse", answer: true }, match,
  ] },
  { questions: [typed] }, { questions: [match] },
] satisfies z.input<typeof props>[];
const { choose, write, read } = c.probesFor("Quiz");
// prettier-ignore
export const probes = [
  choose("Ask me graded practice questions one at a time. Check each submission and explain the right answer before moving on."),
  choose("Let me pick one of three study plans, each with an explanatory sentence. None is right or wrong.", "Choice"),
  write("Ask which reading means water: mizu, yama or kawa. The first option is correct. Then ask me to type the reading of 川, which is kawa."),
  { ...write('Write exactly one question: "Which part absorbs water?" Choices Roots and Leaves, with Roots correct. Keep the plant photo attached but hide it from the question; leave all other appearance settings unset.'),
    variant: { axis: "media", value: "none" } },
  read("Use the quiz's shared choice control to select an answer. Don't check it yet.", { address: "q1", action: "select" }),
  read("Check my answer to the current question.", { address: "q1/check", action: "press" }),
] satisfies c.Probe[];
type QuizProps = c.Props<typeof props, typeof meta>;
// A standalone success/error preview has no controller to submit the example answer.
// prettier-ignore
function preview(input: QuizProps, screen: string, id: string, correct: boolean) {
  const item = input.questions[0];
  if (!item) return;
  const result = c.planAct({ id: screen, components: [{ ...input, id, c: meta.id }] },
    { Quiz: { meta, props, fallback, examples, probes } }, {},
    [...previewQuizSteps(item, id, correct), { address: `${id}/check`, action: "press" }], null);
  return result.ok ? result.values[`${screen}/${id}/${c.sessionKey}`] : undefined;
}

// prettier-ignore
function Options({ labels, part, title, selected, binary, active = true }: {
  labels: string[]; part: "root" | "left" | "right"; title: string; selected?: unknown; binary?: boolean; active?: boolean;
}) {
  const chips = labels.map((label, index) =>
    <kit.KitChip key={index} item={null} part={active ? "root" : null} value={quizKey(part, index)}
      label={label} role="radio" look={binary ? "box" : "pill"} on={index === selected} />);
  return <kit.KitTrack part={part} role="radiogroup" label={title}>
    {part !== "root" ? <kit.KitGrid arrange="rows" group="sections" groups={[{ id: part, heading: title, children: chips }]} children={null} />
      : binary ? <kit.KitGrid>{chips}</kit.KitGrid> : chips}</kit.KitTrack>;
}

// prettier-ignore
function MatchChoices({ item, answers }: { item: QuizItem; answers: Readonly<c.Values> }) {
  const { lang, words: { quiz } } = kit.useWords(learningWordsFor);
  const active = answers.left !== undefined;
  const labels = quizMatches(item, answers, lang);
  return <kit.KitContent>
    <kit.KitText role="label" tone="muted" part={null}>{active ? quiz.pickRight : quiz.pickLeft}</kit.KitText>
    <kit.KitGrid>
      <Options part="left" title={quiz.left} labels={labels.left} selected={answers.left} />
      <Options part="right" title={quiz.right} labels={labels.right} active={active} />
    </kit.KitGrid>
  </kit.KitContent>;
}

// prettier-ignore
function Feedback({ item, round }: { item: QuizItem; round: QuizRound }) {
  const { lang, words: { quiz } } = kit.useWords(learningWordsFor);
  const correct = round.assessment?.correct;
  return <>
    <kit.KitContent group="response">
      <kit.KitText role="heading" tone={correct ? "good" : "bad"} part="feedback">{correct ? quiz.correct : quiz.incorrect}</kit.KitText>
      <kit.KitText role="number" numberScale="compact" tabular part="score">{quizProgress(round, lang).score}</kit.KitText>
    </kit.KitContent>
    <kit.KitContent>
      <kit.KitText role="label" tone="muted" part={null}>{quiz.solution}</kit.KitText>
      {quizSolution(item, lang).map((line, index) => <kit.KitText key={index} part={index === 0 ? "answer" : null}>{line}</kit.KitText>)}
      {item.explain && <kit.KitText part="explain" tone="muted">{item.explain}</kit.KitText>}
    </kit.KitContent>
    {!round.complete && <kit.KitAction full label={quiz.next} part="next" action="press" />}
  </>;
}

// prettier-ignore
export function Quiz(input: QuizProps) {
  const { screen, component, state } = kit.usePartContext(), { controller } = kit.useKit();
  const { lang, words: { quiz } } = kit.useWords(learningWordsFor);
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const media = kit.useVariant("media", meta.variants.media, input.media);
  const saved = kit.useControlValue<unknown>(`${screen}/${component}/${c.sessionKey}`, undefined);
  const round = c.sessionState(meta, input, () => !controller && !saved && (state === "success" || state === "error")
    ? preview(input, screen, component, state === "success") : saved);
  if (round?.kind !== "rounds" || !round.assessment) return <kit.KitCard padded><kit.KitEmpty /></kit.KitCard>;
  const item = round.item as QuizItem, { answers, ready } = round.assessment;
  const options = quizChoices(item, lang);
  return <kit.KitCard key={round.index} part={!round.revealed && options.length ? "panel" : "root"} padded {...{ density, surface }}>
    <kit.KitContent density={density} leadingAlign="row"
      lead={media === "thumb" && item.photo && <kit.KitPhoto photo={item.photo} shape="thumb" part="photo" label={quiz.photo} />}>
      <kit.KitText role="label" tone="muted" part="progress">{quizProgress(round, lang).progress}</kit.KitText>
      <kit.KitText role="heading" density={density} tone={round.revealed ? "muted" : "text"} part="question">{item.question}</kit.KitText>
    </kit.KitContent>
    {round.revealed ? <Feedback {...{ item, round }} /> : <kit.KitContent group="response">
      {options.length > 0 && <Options labels={options} title={item.question} part="root" binary={item.kind === "truefalse"} selected={answers.root} />}
      {item.kind === "type" && <kit.KitInput projected hint={quiz.type} value={typeof answers.field === "string" ? answers.field : ""} />}
      {item.kind === "match" && <MatchChoices {...{ item, answers }} />}
      <kit.KitContent group="response"><kit.KitAction full kind={ready ? "primary" : "secondary"} label={quiz.check} part="check" action="press" disabled={!ready} /></kit.KitContent>
    </kit.KitContent>}</kit.KitCard>;
}

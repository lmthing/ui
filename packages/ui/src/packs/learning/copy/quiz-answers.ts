import type { ActStep, Values } from "../../../catalog";

type Pair = { left: string; right: string };
export type QuizItem = {
  question: string;
  kind: "choice" | "truefalse" | "type" | "match";
  options?: string[] | undefined;
  pairs?: Pair[] | undefined;
  answer?: number | boolean | string | undefined;
  explain?: string | undefined;
  photo?: string | undefined;
};

export const rightOrder = (pairs: readonly Pair[]) => {
  const order = pairs.map(({ right }, index) => ({ right, index }));
  order.sort((a, b) => (a.right < b.right ? -1 : a.right > b.right ? 1 : 0));
  if (order.every(({ index }, at) => index === at)) order.reverse();
  return order;
};

type Answers = Readonly<Values>;
type Mapping = Record<number, number>;
export const mappingOf = (answers: Answers) => (answers.pairs ?? {}) as Mapping;
const indexes = (count: number) => Array.from({ length: count }, (_, index) => index);
type ChoicePart = "root" | "left" | "right";
const keys = "ABCDEFGHIJ";
const rightStart = 5;
// Named keys on screen are also the values sent by KitTrack's unstamped chips.
export function quizKey(part: ChoicePart, index: number): string {
  return keys[(part === "right" ? rightStart : 0) + index]!;
}
const choices = (part: ChoicePart, count: number) => [
  ...indexes(count),
  ...indexes(count).map((index) => quizKey(part, index)),
];
const indexOf = (value: unknown) =>
  typeof value === "number"
    ? value
    : typeof value === "string" && /^[A-J]$/.test(value)
      ? keys.indexOf(value) % rightStart
      : undefined;

export function projectQuiz(item: Answers, answers: Answers) {
  const { kind, options, pairs } = item as QuizItem;
  const selected_left = indexOf(answers.left);
  return {
    kind,
    option_indexes: choices("root", kind === "truefalse" ? 2 : (options?.length ?? 0)),
    match_indexes: choices("left", pairs?.length ?? 0),
    right_indexes: choices("right", pairs?.length ?? 0),
    has_left: selected_left !== undefined,
    selected_option: indexOf(answers.root),
    selected_left,
    selected_right: indexOf(answers.right),
  };
}

export function reviseQuiz(answers: Answers, part: string, value: unknown): Answers {
  if (part === "field") return { field: value };
  const index = indexOf(value);
  if (index === undefined) return answers;
  if (part === "root") return { root: index };
  if (part === "left") return { ...answers, left: index, right: undefined };
  const left = indexOf(answers.left);
  if (part !== "right" || left === undefined) return answers;
  const pairs = { ...mappingOf(answers) };
  for (const key of Object.keys(pairs)) if (pairs[Number(key)] === index) delete pairs[Number(key)];
  return { pairs: { ...pairs, [left]: index }, right: index };
}

const normalized = (value: string) => value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();

export function gradeQuiz(item: Answers, answers: Answers) {
  const { kind, pairs, answer } = item as QuizItem;
  if (kind === "type") {
    const entry = typeof answers.field === "string" ? normalized(answers.field) : "";
    return entry && typeof answer === "string" ? entry === normalized(answer) : undefined;
  }
  if (kind === "match" && pairs) {
    const mapping = mappingOf(answers);
    const order = rightOrder(pairs);
    if (!pairs.every((_, index) => order[mapping[index]!] !== undefined)) return undefined;
    return pairs.every(({ right }, index) => right === order[mapping[index]!]!.right);
  }
  const selected = indexOf(answers.root);
  if (selected === undefined) return undefined;
  return kind === "truefalse" ? (selected === 0) === answer : selected === answer;
}

export function previewQuizSteps(item: QuizItem, id: string, correct: boolean): ActStep[] {
  if (item.kind === "type")
    return [{ address: `${id}/field`, action: "type", value: correct ? item.answer : `${item.answer}?` }];
  if (item.kind === "match") {
    const order = rightOrder(item.pairs ?? []);
    return order.flatMap(({ index }, right) => [
      { address: `${id}/left`, action: "select", value: index },
      { address: `${id}/right`, action: "select", value: correct ? right : (right + 1) % order.length },
    ]);
  }
  const answer = item.kind === "truefalse" ? (item.answer ? 0 : 1) : Number(item.answer);
  return [{ address: id, action: "select", value: correct ? answer : answer === 0 ? 1 : 0 }];
}

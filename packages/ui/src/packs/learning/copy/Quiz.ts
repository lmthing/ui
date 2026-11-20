import { numberLine, sessionKey, type SessionState, type Values } from "../../../catalog";
import { learningWordsFor } from "../lang";
import { mappingOf, quizKey, rightOrder, type QuizItem } from "./quiz-answers";

export type { QuizItem } from "./quiz-answers";
export type QuizRound = Extract<SessionState, { kind: "rounds" }>;

export function quizOptions(item: QuizItem, lang?: string) {
  const { quiz } = learningWordsFor(lang);
  return item.kind === "truefalse" ? [quiz.true, quiz.false] : (item.options ?? []);
}

export function quizChoices(item: QuizItem, lang?: string) {
  const { quiz } = learningWordsFor(lang);
  return quizOptions(item, lang).map((label, index) => quiz.keyed(label, quizKey("root", index)));
}

export function quizMatches(item: QuizItem, answers: Readonly<Values>, lang?: string) {
  const pairs = item.pairs ?? [];
  const mapping = mappingOf(answers);
  const { quiz } = learningWordsFor(lang);
  const mark = (label: string, index: number, part: "left" | "right", partner?: string) =>
    quiz.keyed(partner ? quiz.paired(label, partner) : label, quizKey(part, index));
  return {
    left: pairs.map(({ left }, index) => {
      const right = mapping[index];
      return mark(left, index, "left", right === undefined ? undefined : quizKey("right", right));
    }),
    right: rightOrder(pairs).map(({ right }, index) => {
      const left = pairs.findIndex((_, left) => mapping[left] === index);
      return mark(right, index, "right", left < 0 ? undefined : quizKey("left", left));
    }),
  };
}

export function quizSolution(item: QuizItem, lang?: string): string[] {
  const { answer, pairs } = item;
  const { quiz } = learningWordsFor(lang);
  if (pairs) return pairs.map(({ left, right }) => quiz.pair(left, right));
  if (typeof answer === "number") return quizOptions(item, lang).slice(answer, answer + 1);
  if (typeof answer === "boolean") return [quiz[answer ? "true" : "false"]];
  return typeof answer === "string" ? [answer] : [];
}

export function quizProgress(round: QuizRound, lang?: string) {
  const { quiz } = learningWordsFor(lang);
  const score = round.assessment!.score;
  return {
    progress: quiz.progress(numberLine(round.index + 1, lang), numberLine(score.of, lang)),
    score: quiz.score(numberLine(score.right, lang), numberLine(score.of, lang)),
  };
}

export function readQuiz(input: unknown, _state: unknown, lang?: string): string[] {
  const round = (input as { [sessionKey]?: QuizRound })[sessionKey];
  if (!round?.assessment) return [];
  const { quiz } = learningWordsFor(lang);
  const item = round.item as QuizItem;
  const { progress } = quizProgress(round, lang);
  if (round.revealed) return [progress, ...(round.complete ? [] : [quiz.next])];
  if (item.kind === "type") return [progress, quiz.type, quiz.check];
  if (item.kind === "match") {
    const answers = round.assessment.answers;
    const { left, right } = quizMatches(item, answers, lang);
    return [
      progress,
      answers.left === undefined ? quiz.pickLeft : quiz.pickRight,
      quiz.left,
      ...left,
      quiz.right,
      ...right,
      quiz.check,
    ];
  }
  return [progress, ...quizChoices(item, lang), quiz.check];
}

import type { Meta } from "../../meta";
import type { Values } from "../index";

export type Rounds = Extract<NonNullable<Meta["session"]>, { kind: "rounds" }>;
export type RoundEvent = "answer" | "reveal" | "hide" | "next" | "rate";
export type RoundProgress = {
  kind: "rounds";
  index: number;
  revealed: boolean;
  complete?: true;
  answers?: Values;
  grades?: readonly boolean[];
  ratings?: readonly string[];
};
export type RoundState = {
  kind: "rounds";
  index: number;
  revealed: boolean;
  complete: boolean;
  item: Values;
} & (
  | { assessment?: never; recall?: never }
  | {
      assessment: {
        answers: Readonly<Values>;
        ready: boolean;
        correct: boolean | undefined;
        score: { right: number; of: number };
      };
      recall?: never;
    }
  | { assessment?: never; recall: { ratings: readonly string[]; remaining: number } }
);

export function visibleRoundFields(row: Values, hidden: readonly string[]) {
  return Object.fromEntries(Object.entries(row).filter(([key]) => !hidden.includes(key)));
}

export function roundState(session: Rounds, progress: RoundProgress, items: readonly Values[]): RoundState {
  const { index, revealed, answers = {}, grades = [], ratings = [] } = progress;
  const row = items[index]!;
  const count = items.length;
  const item = !revealed
    ? visibleRoundFields(row, session.hidden)
    : session.ratings
      ? visibleRoundFields(row, session.front)
      : row;
  const base = { kind: "rounds", index, revealed, item, complete: revealed && index === count - 1 } as const;
  if (session.hide !== undefined)
    return { ...base, complete: progress.complete === true, item: progress.complete ? {} : item };
  if (session.assessment) {
    return {
      ...base,
      assessment: {
        answers,
        ready: !revealed && session.assessment.grade(row, answers) !== undefined,
        correct: revealed ? grades[index] : undefined,
        score: { right: grades.filter(Boolean).length, of: count },
      },
    };
  }
  if (session.ratings) {
    const complete = ratings.length === count;
    return {
      ...base,
      complete,
      item: complete ? {} : item,
      recall: { ratings, remaining: count - ratings.length },
    };
  }
  return base;
}

export function roundEvent(session: Rounds, part: string, action: string): RoundEvent | undefined {
  if (session.hide !== undefined) {
    if (part === session.reveal && (action === "press" || action === "start")) return "reveal";
    if ((part === session.hide && action === "press") || (part === session.reveal && action === "stop"))
      return "hide";
    return;
  }
  const inputs = session.assessment?.inputs;
  if (inputs && Object.hasOwn(inputs, part) && inputs[part] === action) return "answer";
  if (part === session.reveal && action === (session.ratings ? "flip" : "press")) return "reveal";
  if (action !== "press") return;
  if (part === session.next) return "next";
  if (session.ratings?.includes(part)) return "rate";
}

export function roundAvailable(current: RoundState, event: string) {
  if (event === "answer") return Boolean(current.assessment && !current.revealed);
  if (event === "reveal")
    return !current.revealed && !current.complete && (current.assessment?.ready ?? true);
  if (event === "hide") return current.revealed && !current.complete;
  if (event === "rate") return Boolean(current.recall && current.revealed && !current.complete);
  return event === "next" && current.revealed && !current.complete;
}

export function advanceRound(
  session: Rounds,
  before: RoundProgress,
  items: readonly Values[],
  event: RoundEvent,
  part?: string,
  value?: unknown,
): RoundProgress {
  if (event === "answer") {
    const answers = session.assessment?.revise?.(before.answers ?? {}, part!, value) ?? {
      ...before.answers,
      [part!]: value,
    };
    return { ...before, answers };
  }
  if (event === "reveal") {
    const grade = session.assessment?.grade(items[before.index]!, before.answers ?? {});
    const grades = grade === undefined ? {} : { grades: [...(before.grades ?? []), grade] };
    return { ...before, ...grades, revealed: true };
  }
  if (event === "rate") {
    const ratings = [...(before.ratings ?? []), part!];
    if (ratings.length === items.length) return { ...before, ratings };
    return { ...before, ratings, index: before.index + 1, revealed: false };
  }
  if (event === "hide" && before.index === items.length - 1)
    return { ...before, revealed: false, complete: true };
  const { answers: _answers, ...rest } = before;
  return { ...rest, index: before.index + 1, revealed: false };
}

export function roundActionProps(session: Rounds, props: Values, current: RoundState): Values {
  if (session.actionProps)
    props = { ...props, ...session.actionProps(current.item, current.index, current.revealed) };
  if (session.hide !== undefined)
    return {
      ...props,
      [session.items]: current.complete ? [] : [visibleRoundFields(current.item, session.hidden)],
      revealed: current.revealed,
    };
  if (session.assessment && current.assessment)
    return {
      ...props,
      ...session.assessment.project(current.item, current.assessment.answers),
      checked: current.revealed,
    };
  return session.ratings ? { ...props, flipped: current.revealed } : props;
}

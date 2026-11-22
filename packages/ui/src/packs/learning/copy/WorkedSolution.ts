import { z } from "zod";
import {
  defineLocalState,
  numberLine,
  stepLine,
  type Meta,
  type StateName,
  type Values,
} from "../../../catalog";
import { learningWordsFor } from "../lang";

const stepLimit = 10;
const localSchema = z
  .strictObject({
    seed: z.string().min(1).max(16),
    count: z.int().min(1).max(stepLimit),
    shown: z.int().min(1).max(stepLimit),
  })
  .refine(({ shown, count }) => shown <= count);

export function solutionProgress(count: number, overflow: unknown, shown: unknown, state?: StateName) {
  return overflow === "all" || state === "success"
    ? count
    : Math.min(count, typeof shown === "number" ? shown : 1);
}

export const solutionState = defineLocalState({
  schema: localSchema,
  initial(input) {
    const count = Array.isArray(input.steps) ? input.steps.length : 0;
    return {
      seed: fingerprint([input.problem, input.problemPhoto, input.steps, input.answer, input.overflow]),
      count,
      shown: solutionProgress(count, input.overflow, undefined),
    };
  },
  events: ["next.press", "all.press"],
  reduce(state, { part }) {
    return {
      state: { ...state, shown: part === "all" ? state.count : Math.min(state.count, state.shown + 1) },
    };
  },
  project: ({ shown }) => ({ revealedSteps: shown }),
});

export function projectSolution(input: Readonly<Values>): Values {
  const steps = Array.isArray(input.steps) ? (input.steps as Values[]) : [];
  const shown = solutionProgress(steps.length, input.overflow, input.revealedSteps, input.state as StateName);
  const done = shown === steps.length;
  return {
    shown,
    count: steps.length,
    finalAnswer: input.answer,
    answer: done ? input.answer : undefined,
    moreSteps: !done,
    copyReady: done,
    tutor: input.tutorGoto ? { goto: input.tutorGoto } : undefined,
    sourcePhoto: input.problemPhoto,
    problemPhoto: input.media === "none" ? undefined : input.problemPhoto,
    steps: steps.map((step, index) => ({
      ...step,
      revealed: index < shown,
      copyReady: Boolean(step.formula),
    })),
  };
}

export function workedStepTitle(title: string, index: number, lang?: string) {
  return learningWordsFor(lang).workedSolution.stepTitle(numberLine(index + 1, lang), title);
}

function fingerprint(fields: unknown[]) {
  let hash = 0xcbf29ce484222325n;
  for (const char of JSON.stringify(fields))
    hash = BigInt.asUintN(64, (hash ^ BigInt(char.codePointAt(0)!)) * 0x100000001b3n);
  return hash.toString(16);
}

/** A bounded operation identity for the exact validated solver input, not a positional row key. */
export function solutionIdentity(input: Readonly<Values>) {
  return fingerprint([input.problem, input.subject, input.sourcePhoto]);
}

export const solutionRead: NonNullable<Meta["read"]> = (input, state, lang) => {
  const { shown, count, finalAnswer, answer } = input as {
    shown: number;
    count: number;
    finalAnswer: string;
    answer?: string;
  };
  const words = learningWordsFor(lang).workedSolution;
  const visible = state === "success" ? count : shown;
  return [
    stepLine(visible, count, lang),
    ...(visible === count ? [words.success] : [words.next, words.all]),
    ...(state === "success" && !answer ? [words.answerReading(finalAnswer)] : []),
  ];
};

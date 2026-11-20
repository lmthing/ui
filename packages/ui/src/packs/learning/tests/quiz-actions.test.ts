import { components, planAct, type ActStep } from "@lmthing/ui/catalog";
import { expect, it } from "vitest";
import type { z } from "zod";

const quiz = components.Quiz;
const [choice] = quiz.examples[0]!.questions;
const [binary, match] = quiz.examples[1]!.questions;
const select = (address: string, value: number): ActStep => ({ address, value, action: "select" });

function act(question: z.input<typeof quiz.props>["questions"][number], ...steps: ActStep[]) {
  const screen = { id: "practice", components: [{ id: "q1", c: "Quiz", questions: [question] }] };
  return planAct(screen, { Quiz: quiz }, {}, steps, null);
}

it("only accepts offered option indexes for choice and true/false questions", () => {
  expect(act(choice!, select("q1", 2)).ok).toBe(true);
  expect(act(choice!, select("q1", 3)).ok).toBe(false);
  expect(act(binary!, select("q1", 0)).ok).toBe(true);
  expect(act(binary!, select("q1", 2)).ok).toBe(false);
});

it("requires an available left match before choosing an available right match", () => {
  const left = select("q1/left", 0);
  const right = select("q1/right", 2);
  expect(act(match!, right).ok).toBe(false);
  expect(act(match!, select("q1/left", 3), right).ok).toBe(false);
  expect(act(match!, left, select("q1/right", 3)).ok).toBe(false);
  expect(act(match!, left, right).ok).toBe(true);
});

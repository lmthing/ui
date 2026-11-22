import { expect, it } from "vitest";
import { components, planAct, readScreen, type ActStep } from "@lmthing/ui/catalog";
import { addressedElements, renderInstance } from "../../../../../test/render";

const Quiz = components.Quiz;
const defs = { Quiz };
const order = {
  question: "Put the care tip in order.",
  kind: "order",
  words: ["fern.", "the", "Water"],
  answer: [2, 1, 0],
};
const input = { questions: [order] };
const screen = { id: "home", components: [{ ...input, c: "Quiz", id: "q1" }] };
const check = { address: "q1/check", action: "press" };
const select = (...keys: string[]): ActStep[] =>
  keys.map((value) => ({ address: "q1", action: "select", value }));
const run = (...steps: ActStep[]) => planAct(screen, defs, {}, steps, null);
function read(...steps: ActStep[]) {
  const result = run(...steps);
  if (!result.ok) throw new Error(`Step ${result.at}: ${result.code}`);
  return readScreen(screen, defs, result.values);
}

it("requires a bounded bank and a complete permutation, only for ordering", () => {
  expect(Quiz.props.safeParse(input).success).toBe(true);
  for (const patch of [
    { words: undefined },
    { words: ["same", "same", "same"] },
    { words: ["a", "b"] },
    { words: Array(9).fill("a") },
    { answer: [0, 0, 2] },
    { answer: [0, 1, 3] },
    { answer: [0, 1] },
    { answer: "Water the fern." },
    { options: ["a", "b"] },
    { kind: "type", answer: "yes" },
    { media: "https://example.org/audio" },
  ])
    expect(Quiz.props.safeParse({ questions: [{ ...order, ...patch }] }).success).toBe(false);
});

it("reads the draft, accepts tap-to-remove revisions and grades only a complete order", () => {
  expect(read()).toContain('choices ["fern.","the","Water"]');
  expect(read()).not.toContain("Water the fern.");
  expect(read(...select("W3", "W1"))).toContain("Water fern.");
  expect(run(...select("W4")).ok).toBe(false);
  expect(read(...select("Water", "the"))).toContain("Water the");
  expect(run(...select("W3", "W2"), check).ok).toBe(false);
  expect(read(...select("W1", "W2", "W3"), check)).toContain("correct false");
  const revised = select("W3", "W1", "W1", "W2", "W1");
  expect(read(...revised, check)).toContain("correct true — score 1/1");
  expect(read(...revised, check)).not.toContain("Water the fern.");
  expect(run(...revised, check, ...select("W2")).ok).toBe(false);
});

it("renders a bank of selectable tiles, then the answer only in feedback", () => {
  const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
  const initial = renderInstance("Quiz", input, "filled", theme);
  expect(initial.match(/role="checkbox"/g)).toHaveLength(3);
  expect(initial).not.toContain("Water the fern.");
  expect(addressedElements(initial).get("home/c1/check")?.attributes).toContain('aria-disabled="true"');
  for (const state of ["success", "error"] as const) {
    const parts = addressedElements(renderInstance("Quiz", input, state, theme));
    expect(parts.get("home/c1/answer")?.text).toContain("Water the fern.");
    expect(parts.get("home/c1/feedback")?.text).toContain(state === "success" ? "Correct" : "Not quite");
    expect(parts.has("home/c1/order_hint")).toBe(false);
  }
});

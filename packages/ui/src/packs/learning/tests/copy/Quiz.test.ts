import { expect, it } from "vitest";
import { quizMatches, quizOptions, quizProgress, quizSolution } from "../../copy";

it("labels truth values consistently and renders the revealed solution", () => {
  const item = { kind: "truefalse", question: "Is it blue?", answer: false } as const;
  expect(quizOptions(item)).toEqual(["True", "False"]);
  expect(quizSolution(item)).toEqual(["False"]);
});

it("reorders the right column and shows the same pair marker on both matched entries", () => {
  const item = {
    kind: "match",
    question: "Match them",
    pairs: [
      { left: "Oak", right: "Tree" },
      { left: "Rose", right: "Flower" },
      { left: "Mint", right: "Herb" },
    ],
  } as const;
  const question = { ...item, pairs: [...item.pairs] };
  expect(quizMatches(question, { pairs: { 0: 2 } })).toEqual({
    left: ["A · Oak (H)", "B · Rose", "C · Mint"],
    right: ["F · Flower", "G · Herb", "H · Tree (A)"],
  });
  expect(quizSolution(question)).toEqual(["Oak → Tree", "Rose → Flower", "Mint → Herb"]);
});

it("formats both progress and score in the provided number locale", () => {
  const round = {
    kind: "rounds",
    index: 1,
    revealed: true,
    complete: false,
    item: {},
    assessment: { answers: {}, ready: false, correct: true, score: { right: 1, of: 3 } },
  } as const;
  expect(quizProgress(round, "ar-EG-u-nu-arab")).toEqual({
    progress: "Question ٢ of ٣",
    score: "١ of ٣ correct",
  });
});

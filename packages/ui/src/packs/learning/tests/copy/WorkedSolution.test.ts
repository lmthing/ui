import { expect, it } from "vitest";
import { projectSolution, solutionState, workedStepTitle } from "../../copy";

const seed = {
  problem: "Solve x + 2 = 5.",
  steps: [{ title: "Subtract 2", formula: "x = 5 - 2" }, { title: "Simplify" }, { title: "Check" }],
  answer: "3",
};

it("reveals monotonically up to the count, and does not reuse progress for edited problems", () => {
  const next = { part: "next", action: "press", value: undefined } as const;
  const all = { part: "all", action: "press", value: undefined } as const;
  const initial = solutionState.frame(seed, undefined)!;
  expect(initial.props).toEqual({ revealedSteps: 1 });
  const step = initial.advance(next);
  if (!("stored" in step)) throw Error("Next must advance the solution");
  const partial = solutionState.frame(seed, step.stored)!;
  expect(partial.props).toEqual({ revealedSteps: 2 });
  expect(solutionState.frame({ ...seed, answer: "Updated" }, step.stored)?.props).toEqual({
    revealedSteps: 1,
  });
  const done = partial.advance(all);
  if (!("stored" in done)) throw Error("All must reveal the remaining steps");
  const complete = solutionState.frame(seed, done.stored)!;
  expect(complete.props).toEqual({ revealedSteps: 3 });
  expect(complete.advance(next)).toEqual(done);
});

it("projects disjoint visible steps, answer and formula copy gates without changing the seed", () => {
  const projected = projectSolution(seed);
  expect(projected).toMatchObject({
    answer: undefined,
    copyReady: false,
    moreSteps: true,
    steps: [
      { revealed: true, copyReady: true },
      { revealed: false, copyReady: false },
      { revealed: false, copyReady: false },
    ],
  });
  expect(projectSolution({ ...seed, overflow: "all" })).toMatchObject({
    answer: "3",
    copyReady: true,
    moreSteps: false,
  });
  expect(seed).not.toHaveProperty("revealedSteps");
  expect(workedStepTitle("Simplify", 1, "ar-u-nu-arab")).toBe("٢. Simplify");
});

import { expect, it } from "vitest";
import { advanceRound, roundAvailable, roundState, type RoundProgress, type Rounds } from "./rounds";

it("lets a declared answer reducer accumulate a response and clears it on next", () => {
  const session: Rounds = {
    kind: "rounds",
    items: "rows",
    hidden: ["solution"],
    reveal: "submit",
    next: "go",
    assessment: {
      inputs: { pair: "select" },
      revise: (answers, part, value) => ({
        [part]: [...((answers[part] as number[] | undefined) ?? []), value],
      }),
      project: () => ({}),
      grade: (item, answers) => {
        const pairs = answers.pair as number[] | undefined;
        if (pairs?.length !== 2) return undefined;
        return pairs[0] === item.solution && pairs[1] === 1;
      },
    },
  };
  const items = [{ solution: 0 }, { solution: 2 }];
  let progress: RoundProgress = { kind: "rounds", index: 0, revealed: false };
  const current = () => roundState(session, progress, items);
  expect(current().item).toEqual({});
  progress = advanceRound(session, progress, items, "answer", "pair", 0);
  expect(roundAvailable(current(), "reveal")).toBe(false);
  progress = advanceRound(session, progress, items, "answer", "pair", 1);
  expect(roundAvailable(current(), "reveal")).toBe(true);
  progress = advanceRound(session, progress, items, "reveal");
  expect(current()).toMatchObject({
    item: { solution: 0 },
    assessment: { correct: true, score: { right: 1, of: 2 } },
  });
  expect(roundAvailable(current(), "answer")).toBe(false);
  progress = advanceRound(session, progress, items, "next");
  expect(current()).toMatchObject({
    index: 1,
    item: {},
    assessment: { answers: {}, ready: false, score: { right: 1, of: 2 } },
  });
});

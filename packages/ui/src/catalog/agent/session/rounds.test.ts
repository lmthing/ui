import { expect, it } from "vitest";
import {
  advanceRound,
  roundAvailable,
  roundEvent,
  roundState,
  type RoundProgress,
  type Rounds,
} from "./rounds";

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

it("completes a single private round on hide, not on reveal or a recall flip", () => {
  const session: Rounds = { kind: "rounds", items: "rows", hidden: ["secret"], reveal: "show", hide: "veil" };
  const initial: RoundProgress = { kind: "rounds", index: 0, revealed: false };
  const items = [{ name: "First", secret: "Private text" }];
  expect(roundEvent(session, "show", "flip")).toBeUndefined();
  expect(roundEvent(session, "show", "start")).toBe("reveal");
  expect(roundEvent(session, "show", "stop")).toBe("hide");
  expect(roundEvent(session, "veil", "press")).toBe("hide");
  expect(roundAvailable(roundState(session, initial, items), "hide")).toBe(false);
  const revealed = advanceRound(session, initial, items, "reveal");
  expect(roundState(session, revealed, items)).toMatchObject({ complete: false, item: items[0] });
  const hidden = advanceRound(session, revealed, items, "hide");
  const complete = roundState(session, hidden, items);
  expect(complete).toMatchObject({ index: 0, complete: true, revealed: false, item: {} });
  expect(roundAvailable(complete, "reveal")).toBe(false);
});

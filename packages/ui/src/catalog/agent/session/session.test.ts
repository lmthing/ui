import { expect, it } from "vitest";
import { advanceSession, sessionAvailable, sessionKey, sessionState, sessionStatus } from "./session";
import type { Meta } from "../../meta";

const turns = {
  session: {
    kind: "turns",
    items: "roster",
    first: "start",
    direction: "order",
    laps: "limit",
    next: "advance",
    back: "undo",
  },
} as Meta;

it("counts completed turns from the chosen first player, not a wrap around index zero", () => {
  const props = {
    roster: [{ name: "A" }, { name: "B" }, { name: "C" }],
    start: 1,
    order: "reverse",
    limit: 2,
  };
  let stored: unknown;
  const get = (part: string) => (part === sessionKey ? stored : undefined);
  const advance = () => (stored = advanceSession(turns, props, get, "next"));
  const indices = [1, 0, 2, 1, 0, 2, 2];
  for (const [turn, index] of indices.entries()) {
    expect(sessionState(turns, props, get)).toMatchObject({
      index,
      turns: turn,
      direction: "reverse",
      lap: turn < 3 ? 1 : 2,
      complete: turn === 6,
    });
    if (turn < 6) advance();
  }
  expect(sessionStatus(turns, props, "filled", get)).toBe("success");
  expect(sessionStatus(turns, props, "loading", get)).toBe("loading");
  const current = sessionState(turns, props, get);
  expect(sessionAvailable(current, "next")).toBe(false);
  expect(sessionAvailable(current, "back")).toBe(true);
});

it("projects from the new seed instead of matching progress to a replaced roster", () => {
  const props = { roster: [{ name: "A" }, { name: "B" }], start: 1 };
  const stored = advanceSession(turns, props, () => undefined, "skip");
  expect(sessionState(turns, props, () => stored)).toMatchObject({ index: 0, turns: 1, skips: 1 });
  expect(
    sessionState(turns, { ...props, roster: [{ name: "C" }, { name: "D" }] }, () => stored),
  ).toMatchObject({ index: 1, turns: 0, skips: 0 });
});

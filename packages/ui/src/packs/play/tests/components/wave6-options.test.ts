import { expect, it } from "vitest";
import { components, type ScreenLike } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
type Id = "ScoreSheet" | "Dice" | "Trivia";
function game(c: Id, input: Record<string, unknown>, random?: () => number) {
  const screen: ScreenLike = { id: "home", components: [{ ...input, id: "c1", c }] };
  return createScreenController({ screen, defs: components, ...(random ? { random } : {}) });
}
const part = (name: string) => `home/c1/${name}`;

it("rolls a numbered pool, drops exactly one tied extreme and adds the modifier once", () => {
  const input = { count: 4, sides: 8, style: "pool", mod: -3, drop: "low" };
  const dice = components.Dice;
  expect(dice.props.safeParse(input).success).toBe(true);
  for (const invalid of [{ mod: -21 }, { mod: 21 }, { mod: 1.5 }, { drop: "all" }])
    expect(dice.props.safeParse({ ...input, ...invalid }).success).toBe(false);
  const html = renderInstance("Dice", input, "empty", theme);
  expect(addressedElements(html).get(part("pool"))?.text).toEqual(["Dice pool"]);
  expect(addressedElements(html).get(part("rules"))?.text).toEqual(["Modifier -3 · Drop lowest"]);
  const random = [0, 0, 7, 5, 4, 5, 7];
  const controller = game("Dice", { ...input, state: "empty" }, () => random.shift()!);
  try {
    expect(controller.read()).toContain(
      "Dice[pool] (empty) 4 dice · 8 sides — Modifier -3 · Drop lowest — Dice pool",
    );
    expect(controller.read()).toContain("[c1/roll press]");
    expect(controller.read()).not.toContain("Total");
    expect(controller.press("c1/roll").ok).toBe(true);
    expect(controller.read()).toContain("Total 12");
    expect(controller.read()).toContain("Die 1, showing 1 · Dropped");
    expect(controller.read()).toContain("Die 2, showing 1 · Counted");
    expect(controller.act({ address: "c1/r1/hold", action: "toggle" }).ok).toBe(true);
    expect(controller.press("c1/roll").ok).toBe(true);
    expect(controller.read()).toContain("Die 1, showing 1, held · Dropped");
    expect(controller.read()).toContain("Total 16");
    expect(controller.snapshotScreen().components[0]).not.toHaveProperty("faces");
  } finally {
    controller.dispose();
  }
});

it("uses zero and both modifier bounds, and supports dropping the highest without pool style", () => {
  for (const mod of [-20, 0, 20]) {
    const controller = game("Dice", { mod, drop: "high" }, () => 5);
    try {
      expect(controller.press("c1/roll").ok).toBe(true);
      expect(controller.read()).toContain(`Total ${6 + mod}`);
      expect(controller.read()).toContain("Die 1, showing 6 · Dropped");
      expect(controller.read()).not.toContain("Dice pool");
    } finally {
      controller.dispose();
    }
  }
});

const bidding = {
  players: [{ name: "Anna" }, { name: "Ben" }],
  rounds: [
    { label: "First", points: [4, null], bids: [3, null] },
    { label: "Second", points: [null, null] },
  ],
  goal: 5,
};

it("keeps bids paired with live scores across paging, edits and confirmed resets", () => {
  const { props } = components.ScoreSheet;
  for (const bids of [[3], [3, 1, 0], [3, 1000], [3, 1.5]])
    expect(props.safeParse({ ...bidding, rounds: [{ ...bidding.rounds[0], bids }] }).success).toBe(false);
  expect(props.safeParse({ ...bidding, goal: 0.5 }).success).toBe(false);
  const input = { ...bidding, overflow: "page" };
  const view = addressedElements(renderInstance("ScoreSheet", input, "filled", theme));
  expect(view.get(part("goal"))).toMatchObject({ text: ["Target: "], children: [{ text: ["5"] }] });
  expect(view.get(part("r1/bid"))?.text).toEqual(["Bid 3"]);
  expect(view.get(part("r2/bid"))?.text).toEqual(["Bid —"]);
  expect(view.get(part("r1/score"))?.attributes).toContain('aria-label="Anna, First, Made"');
  expect(view.has(part("goal_reached"))).toBe(false);
  const grid = addressedElements(renderInstance("ScoreSheet", bidding, "filled", theme));
  expect(grid.has(part("r3/bid"))).toBe(false);
  expect(addressedElements(renderInstance("ScoreSheet", input, "loading", theme)).has(part("r1/bid"))).toBe(
    false,
  );
  const controller = game("ScoreSheet", input);
  try {
    expect(controller.read()).toContain("Anna, First: Bid 3 · Made: 4");
    expect(controller.read()).not.toContain("Reached by");
    expect(controller.act({ address: "c1/root", action: "select", value: "2" }).ok).toBe(true);
    expect(controller.read()).not.toContain("Bid 3");
    expect(controller.act({ address: "c1/r3/score", action: "set", value: 1 }).ok).toBe(true);
    expect(controller.read()).toContain("Reached by Anna");
    expect(controller.read()).not.toContain("Winner");
    expect(controller.press("c1/reset").ok).toBe(true);
    expect(controller.press("confirm/confirm").ok).toBe(true);
    expect(controller.snapshotScreen().components[0]?.rounds).toEqual([
      { label: "First", points: [null, null], bids: [3, null] },
      { label: "Second", points: [null, null] },
    ]);
    expect(controller.read()).not.toContain("Reached by");
  } finally {
    controller.dispose();
  }
});

it("treats a low-score goal as a ceiling without counting an unplayed row", () => {
  const input = { ...bidding, wins: "low", goal: 4 };
  const view = addressedElements(renderInstance("ScoreSheet", input, "filled", theme));
  expect(view.get(part("goal_reached"))?.text).toEqual(["Reached by Anna"]);
});

it("reads visible goal and bid results in success without adding controls or changing the old read", () => {
  const input = { ...bidding, overflow: "page", share: true, state: "success", goal: 4 };
  const controller = game("ScoreSheet", input);
  const legacy = game("ScoreSheet", {
    ...input,
    goal: undefined,
    rounds: bidding.rounds.map(({ label, points }) => ({ label, points })),
  });
  try {
    expect(controller.read()).toContain("Target: 4 — Reached by Anna");
    expect(controller.read()).toContain("Anna, First: Bid 3 · Made: 4");
    expect(controller.read()).not.toMatch(/Second|Reset scores|Share scores|\[c1[ /]|\br[34]\b/);
    expect(legacy.read()).toBe("screen home\nc1 ScoreSheet (success)");
  } finally {
    controller.dispose();
    legacy.dispose();
  }
});

it("renders and reads only the current unrevealed trivia choices without offering a selection", () => {
  const first = { question: "First question", answer: "Shown only on reveal", choices: ["One", "Two"] };
  const second = {
    question: "Second question",
    answer: "Next solution",
    choices: ["Three", "Four", "Five", "Six"],
  };
  const input = { questions: [first, second] };
  for (const choices of [[], ["One"], Array(5).fill("One"), [" ", "Two"], ["x".repeat(121), "Two"]])
    expect(components.Trivia.props.safeParse({ questions: [{ ...first, choices }] }).success).toBe(false);
  const filled = addressedElements(renderInstance("Trivia", input, "filled", theme));
  expect(filled.has(part("answer"))).toBe(false);
  expect(filled.get(part("choice_1"))?.text).toEqual(["One"]);
  expect(filled.get(part("choice_1"))?.attributes).not.toMatch(/role=|tabindex=/);
  for (const state of ["success", "loading", "empty"] as const)
    expect(addressedElements(renderInstance("Trivia", input, state, theme)).has(part("choices"))).toBe(false);
  const controller = game("Trivia", input);
  try {
    expect(controller.read()).toContain('Choices — "One" — "Two"');
    expect(controller.read()).not.toMatch(/Shown only on reveal|Three|Next solution/);
    expect(controller.act({ address: "c1/choice_1", action: "select" }).ok).toBe(false);
    expect(controller.press("c1/reveal").ok).toBe(true);
    expect(controller.read()).toContain(first.answer);
    expect(controller.read()).not.toContain("Choices");
    expect(controller.press("c1/next").ok).toBe(true);
    expect(controller.read()).toContain('Choices — "Three" — "Four" — "Five" — "Six"');
    expect(controller.read()).not.toContain(second.answer);
  } finally {
    controller.dispose();
  }
});

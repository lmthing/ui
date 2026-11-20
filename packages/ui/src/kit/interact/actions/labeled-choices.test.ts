import { expect, it } from "vitest";
import { components, planAct, readScreen, type Definition } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { moneyWordsFor } from "../../../packs/money/lang";

const scoreSheet = components.ScoreSheet;
const scoreScreen = {
  id: "game",
  components: [
    {
      id: "s1",
      c: "ScoreSheet",
      ...scoreSheet.examples[1]!,
      rounds: [
        { label: "First hand", points: [-2, 5] },
        { label: "Second hand", points: [null, null] },
      ],
    },
  ],
};
const chooseRound = (value: string) => ({ address: "game/s1/root", action: "select", value });

it("offers ScoreSheet round names and keeps stored round keys and score addresses", () => {
  const def = {
    ...scoreSheet,
    meta: {
      ...scoreSheet.meta,
      select: { prop: "selectedRound", choices: { root: { prop: "roundOptions" } } },
    },
    props: scoreSheet.props.overwrite((input) => ({
      ...input,
      roundOptions: input.rounds.map(({ label }, index) => ({ value: String(index + 1), label })),
    })),
  } satisfies Definition;
  const runtime = createScreenController({ screen: scoreScreen, defs: { ScoreSheet: def } });
  try {
    const choices = 'choices ["First hand","Second hand"]';
    expect(runtime.read()).toContain(`[s1 select = "First hand"; ${choices}]`);
    expect(runtime.act(chooseRound("Second hand"))).toMatchObject({ ok: true });
    expect(runtime.store.get("game/s1/$selectedRound")).toBe("2");
    expect(runtime.snapshotScreen().components[0]!.selectedRound).toBe("2");
    expect(runtime.read()).toContain(`[s1 select = "Second hand"; ${choices}]`);
    expect(runtime.read()).toContain("[s1/r3/score set");
    expect(runtime.read()).not.toContain("[s1/r1/score set");
    expect(runtime.act(chooseRound("Third hand"))).toMatchObject({ ok: false, code: "invalid_value" });
    expect(runtime.store.get("game/s1/$selectedRound")).toBe("2");
    expect(runtime.act(chooseRound("1"))).toMatchObject({ ok: true });
    expect(runtime.read()).toContain(`[s1 select = "First hand"; ${choices}]`);
  } finally {
    runtime.dispose();
  }
});

it("offers Payoff's visible strategy names while acting on the strategy enum", () => {
  const payoff = components.Payoff;
  const { choice } = moneyWordsFor().payoff;
  const def = {
    ...payoff,
    meta: {
      ...payoff.meta,
      select: {
        prop: "strategy",
        choices: {
          strategy: [
            { value: "high_rate", label: choice.high_rate },
            { value: "small_balance", label: choice.small_balance },
          ],
        },
      },
    },
  } satisfies Definition;
  const defs = { Payoff: def };
  const screen = { id: "home", components: [{ id: "p1", c: "Payoff", ...payoff.examples[0]! }] };
  const choose = (value: string) => ({ address: "p1/strategy", action: "select", value });
  const choices = 'choices ["Highest rate","Smallest balance"]';
  expect(readScreen(screen, defs)).toContain(`[p1/strategy select = "Highest rate"; ${choices}]`);
  const result = planAct(screen, defs, {}, [choose("Smallest balance")]);
  expect(result).toMatchObject({ ok: true, values: { "home/p1/$strategy": "small_balance" } });
  if (!result.ok) return;
  expect(readScreen(screen, defs, result.values)).toContain(
    `[p1/strategy select = "Smallest balance"; ${choices}]`,
  );
  expect(planAct(screen, defs, result.values, [choose("high_rate")])).toMatchObject({
    ok: true,
    values: { "home/p1/$strategy": "high_rate" },
  });
  expect(planAct(screen, defs, result.values, [choose("Largest balance")])).toMatchObject({
    ok: false,
    code: "invalid_value",
  });
});

it("leaves unlabelled select offers and validation unchanged", () => {
  const defs = { ScoreSheet: scoreSheet };
  expect(readScreen(scoreScreen, defs)).toContain('[s1 select = "1"; choices ["1","2"]]');
  const result = planAct(scoreScreen, defs, {}, [chooseRound("2")]);
  expect(result).toMatchObject({ ok: true, values: { "game/s1/$selectedRound": "2" } });
  if (!result.ok) return;
  expect(readScreen(scoreScreen, defs, result.values)).toContain('[s1 select = "2"; choices ["1","2"]]');
  expect(planAct(scoreScreen, defs, result.values, [chooseRound("First hand")])).toMatchObject({
    ok: false,
    code: "invalid_value",
  });
});

import { expect, it, vi } from "vitest";
import { z } from "zod";
import {
  sessionKey,
  sessionState,
  stampItemIds,
  text,
  type Definition,
  type Meta,
} from "../../../../catalog";
import { createInteractionStore, createScreenController } from "../../index";
const base = {
  id: "SequenceFixture",
  group: "data",
  purpose: "Exercise progress through a sequence.",
  pick: "A fixture for declared sessions.",
  region: "body",
  weight: 1,
  tier: "phone",
  realPath: "Device-held progress.",
  confirmParts: ["reset"],
} as const satisfies Meta;
const fixture = (meta: Meta, props: Definition["props"]): Definition => ({
  meta,
  props,
  fallback: () => ({}),
  examples: [],
  probes: [],
});
const roster = fixture(
  {
    ...base,
    items: { key: "people", parts: ["name"] },
    session: {
      kind: "turns",
      items: "people",
      first: "start",
      direction: "rotation",
      laps: "rounds",
      next: "go",
      skip: "pass",
      back: "undo",
      reverse: "flip",
      restart: "reset",
    },
    actions: {
      parts: { go: ["press"], pass: ["press"], undo: ["press"], flip: ["press"], reset: ["press"] },
    },
    successActions: ["reset.press"],
    read: (input) => {
      const { people, $session } = input as {
        people: { name: string }[];
        $session: { index: number; lap: number; direction: string };
      };
      return [`Current ${people[$session.index]!.name}, lap ${$session.lap}, ${$session.direction}`];
    },
  },
  z.strictObject({
    people: z.array(z.strictObject({ name: text(24) })).min(2),
    start: z.int().default(0),
    rotation: z.enum(["forward", "reverse"]).default("forward"),
    rounds: z.int().optional(),
  }),
);
const quiz = fixture(
  {
    ...base,
    session: {
      kind: "rounds",
      items: "deck",
      hidden: ["reply", "detail"],
      reveal: "show",
      next: "go",
      restart: "reset",
    },
    actions: { parts: { show: ["press"], go: ["press"], reset: ["press"] } },
    successActions: ["go.press", "reset.press"],
    read: (input) => {
      const { deck } = input as { deck: { reply?: string; detail?: string; points: number }[] };
      return [`${deck[0]!.points} points`, ...deck.flatMap((row) => row.reply ?? [])];
    },
  },
  z.strictObject({
    deck: z
      .array(
        z.strictObject({
          prompt: text(24),
          reply: text(24),
          detail: text(32).optional(),
          points: z.int().default(1),
        }),
      )
      .min(1),
  }),
);
const seed = {
  deck: [
    { prompt: "Question one", reply: "Answer one", detail: "Explanation one", points: 2 },
    { prompt: "Question two", reply: "Answer two" },
  ],
};
const press = (part: string) => ({ address: `game/${part}`, action: "press" });
const confirm = { address: "confirm/confirm", action: "press" };
function game(def: Definition, input: Record<string, unknown>, requireMounted = false) {
  const screen = { id: "s", components: [{ id: "game", c: def.meta.id, ...input }] };
  const defs = { [def.meta.id]: def };
  const store = createInteractionStore({ "s/score/r1/points": 23 });
  const onAction = vi.fn(() => store.get(`s/game/${sessionKey}`));
  const runtime = createScreenController({ screen, defs, store, onAction, requireMounted });
  const view = () => {
    const { id: _id, c: _c, state, ...wire } = runtime.snapshotScreen().components[0]!;
    const props = stampItemIds(def.meta, def.props.parse(wire));
    return {
      state: state ?? "filled",
      session: sessionState(def.meta, props, (part) => store.get(`s/game/${part}`)),
    };
  };
  return { screen, defs, store, runtime, onAction, view };
}
it("keeps the turn cursor, skipped turns, lap, direction, reader, and completion in sync", () => {
  const { runtime, view, onAction } = game(roster, {
    people: [{ name: "One" }, { name: "Two" }, { name: "Three" }],
    start: 1,
    rounds: 1,
  });
  expect(runtime.canPress("game/undo")).toBe(false);
  expect(runtime.act([press("pass"), press("flip"), press("undo")]).ok).toBe(true);
  expect(view().session).toMatchObject({ index: 1, direction: "reverse", lap: 1, turns: 0, skips: 0 });
  expect(runtime.act([press("go"), press("pass")]).ok).toBe(true);
  expect(view().session).toMatchObject({ index: 2, direction: "reverse", turns: 2, skips: 1 });
  expect(runtime.read()).toContain("Current Three, lap 1, reverse");
  expect(runtime.press("game/go").ok).toBe(true);
  expect(view()).toMatchObject({ state: "success", session: { index: 2, turns: 3, complete: true } });
  for (const part of ["go", "pass", "flip", "undo"]) {
    expect(runtime.actionsAt(`game/${part}`)).toEqual([]);
    expect(runtime.read()).not.toContain(`[game/${part} press]`);
  }
  expect(runtime.read()).toContain("(success) Current Three, lap 1, reverse [game/reset press]");
  expect(runtime.press("game/reset").ok).toBe(true);
  expect(onAction).toHaveBeenCalledTimes(6);
  expect(view().state).toBe("success");
  expect(runtime.act(confirm).ok).toBe(true);
  expect(onAction).toHaveLastReturnedWith(undefined);
  expect(view()).toMatchObject({ state: "filled", session: { index: 1, direction: "forward", turns: 0 } });
});
it("projects only the active Trivia question and reveals, advances, and restarts through the controller", () => {
  const { runtime, view, store } = game(quiz, seed);
  expect(view()).toEqual({
    state: "filled",
    session: {
      kind: "rounds",
      index: 0,
      revealed: false,
      complete: false,
      item: { prompt: "Question one", points: 2 },
    },
  });
  expect(runtime.read()).toContain('"Question one" [game/show press]');
  expect(runtime.read()).not.toMatch(/Answer|Explanation|Question two|\[game\/go/);
  expect(runtime.press("game/go").ok).toBe(false);
  expect(runtime.press("game/show").ok).toBe(true);
  expect(view()).toMatchObject({
    state: "success",
    session: { revealed: true, item: { reply: "Answer one" } },
  });
  expect(runtime.read()).toContain('"Question one" — "Answer one" — "Explanation one" [game/go press]');
  expect(runtime.read()).not.toMatch(/Question two|Answer two|\[game\/show/);
  expect(runtime.press("game/reset").ok).toBe(true);
  expect(runtime.press("confirm/cancel").ok).toBe(true);
  expect(view().state).toBe("success");
  expect(runtime.act([press("go"), press("show")]).ok).toBe(true);
  expect(view()).toMatchObject({ state: "success", session: { index: 1, complete: true } });
  expect(runtime.read()).toContain('"Question two" — "Answer two" [game/reset press]');
  expect(runtime.canPress("game/go")).toBe(false);
  expect(runtime.act([press("reset"), confirm]).ok).toBe(true);
  expect(view()).toMatchObject({ state: "filled", session: { index: 0, revealed: false } });
  expect(store.get("s/score/r1/points")).toBe(23);
  expect(quiz.props.safeParse({ ...seed, index: 1, revealed: true }).success).toBe(false);
});
it("validates newly offered mounted-batch actions, rolls them back, and honors loading", () => {
  const { runtime, store, view, onAction } = game(quiz, seed, true);
  runtime.registerPart("game/show");
  expect(runtime.act(press("reset"))).toMatchObject({ ok: false, code: "not_mounted" });
  runtime.registerPart("game/reset");
  expect(runtime.act([press("show"), press("go")], { dryRun: true }).ok).toBe(true);
  expect(runtime.act([press("show"), press("go"), press("go")])).toMatchObject({ ok: false, at: 2 });
  expect(onAction).not.toHaveBeenCalled();
  expect(view()).toMatchObject({ state: "filled", session: { index: 0, revealed: false } });
  const invalid = [press("show"), press("reset"), confirm, press("go")];
  expect(runtime.act(invalid)).toMatchObject({ ok: false, at: 3 });
  expect(runtime.confirmation).toBeUndefined();
  runtime.registerPart("game/go");
  runtime.registerDisabledPart("game/go");
  expect(runtime.act([press("show"), press("go"), press("show")]).ok).toBe(true);
  store.set("s/game/$state", "loading");
  expect(runtime.read()).toBe("screen s\ngame SequenceFixture (loading)");
  expect(runtime.act(press("go")).ok).toBe(false);
  store.set("s/game/$state", undefined);
  expect(view().state).toBe("success");
});

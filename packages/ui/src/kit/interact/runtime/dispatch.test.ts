import { expect, it, vi } from "vitest";
import { z } from "zod";
import { drawKey, drawState, type Definition, type Meta, type ScreenLike } from "../../../catalog";
import { createInteractionStore, createScreenController } from "../index";

const base = {
  id: "ChanceFixture",
  group: "action",
  purpose: "Exercise declared actions.",
  pick: "A fixture for runtime tests.",
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Draw and retain a result.",
} as const satisfies Meta;
type Entry = ScreenLike["components"][number];

function run(
  meta: Partial<Meta>,
  props: Definition["props"],
  input: Record<string, unknown>,
  state: Entry["state"] = "empty",
  words = [2, 4, 5, 1, 3],
) {
  const defs: Record<string, Definition> = {
    ChanceFixture: {
      meta: { ...base, ...meta },
      props,
      fallback: () => input,
      examples: [input],
      probes: [],
    },
  };
  const screen = { id: "s", components: [{ id: "c1", c: base.id, ...input, state }] };
  const store = createInteractionStore();
  const random = vi.fn(() => words.shift()!);
  const result = () =>
    store.get(`s/c1/${drawKey}`) === undefined
      ? undefined
      : drawState(defs.ChanceFixture!.meta, input, (part) => store.get(`s/c1/${part}`));
  const afterAction = vi.fn(result);
  const runtime = createScreenController({ screen, defs, store, random, onAction: afterAction });
  return { runtime, random, afterAction, result };
}

const facesMeta = {
  draw: { kind: "faces", press: "roll", count: "count", sides: "sides", hold: "hold" },
  items: { key: "dice", parts: ["root", "hold"] },
  actions: { parts: { roll: ["press"], other: ["press"] }, items: { hold: ["toggle"] } },
  emptyActions: ["roll.press"],
} as const satisfies Partial<Meta>;
const facesProps = z.strictObject({ count: z.int().min(1).max(6), sides: z.int().min(2).max(20) });
it("draws from empty, retains held faces, and keeps read and controls in sync", () => {
  const { runtime, random, afterAction, result } = run(facesMeta, facesProps, { count: 2, sides: 6 });
  expect(runtime.read()).toBe("screen s\nc1 ChanceFixture (empty) [c1/roll press]");
  expect(runtime.canPress("s/c1/other")).toBe(false);
  expect(runtime.press("s/c1/roll")).toMatchObject({ ok: true });
  expect(runtime.snapshotScreen().components[0]).toEqual({
    id: "c1",
    c: "ChanceFixture",
    count: 2,
    sides: 6,
    state: "filled",
  });
  expect(result()).toEqual({ kind: "faces", faces: [3, 5], held: [false, false] });
  expect(afterAction).toHaveReturnedWith(result());
  expect(runtime.press("s/c1/r1/hold")).toMatchObject({ ok: true, changed: "c1/r1/hold toggle = true" });
  expect(runtime.press("c1/roll").ok).toBe(true);
  expect(result()).toEqual({ kind: "faces", faces: [3, 6], held: [true, false] });
  expect(runtime.read()).toContain("faces=[3,6] — held=[true,false]");
  expect(runtime.read()).toContain("[c1/r1/hold toggle:on]");
  expect(runtime.press("c1/r2/hold").ok).toBe(true);
  expect(runtime.canPress("c1/roll")).toBe(false);
  expect(runtime.act({ address: "c1/roll", action: "press" }).ok).toBe(false);
  expect(runtime.read()).not.toContain("[c1/roll press]");
  expect(random).toHaveBeenCalledTimes(3);
  expect(runtime.press("c1/r1/hold").ok).toBe(true);
  runtime.store.set("s/c1/$state", "loading");
  expect(runtime.actionsAt("c1/roll")).toEqual([]);
  expect(runtime.act({ address: "c1/roll", action: "press" }).ok).toBe(false);
  expect(runtime.read()).toBe("screen s\nc1 ChanceFixture (loading)");
  expect(result()).toMatchObject({ faces: [3, 6] });
  runtime.store.set("s/c1/$state", undefined);
  expect(runtime.read()).toContain("faces=[3,6]");
  expect(random).toHaveBeenCalledTimes(3);
});

it("does not commit or use entropy for dry runs and rejected batches", () => {
  const { runtime, random, result } = run(facesMeta, facesProps, { count: 2, sides: 6 });
  const roll = { address: "c1/roll", action: "press" };
  const hold = { address: "c1/r2/hold", action: "toggle" };
  expect(runtime.act([roll, hold], { dryRun: true })).toMatchObject({
    ok: true,
    changed: "c1/roll press\nc1/r2/hold toggle = true",
  });
  expect(runtime.act([roll, { ...hold, address: "c1/r3/hold" }])).toMatchObject({ ok: false, at: 1 });
  expect(random).not.toHaveBeenCalled();
  expect(result()).toBeUndefined();
  expect(runtime.act([roll, hold, roll]).ok).toBe(true);
  expect(random).toHaveBeenCalledTimes(3);
  expect(result()).toEqual({ kind: "faces", faces: [6, 5], held: [false, true] });
});

it("enables only declared actions in empty, even without a draw", () => {
  const actions = { parts: { start: ["press"], other: ["press"] } } as const;
  const props = z.strictObject({});
  const legacy = run({ actions }, props, {}).runtime;
  expect(legacy.press("c1/start").ok).toBe(false);
  expect(legacy.read()).not.toContain("[c1/start press]");
  const optedIn = run({ actions, emptyActions: ["start.press"] }, props, {}).runtime;
  expect(optedIn.read()).toContain("[c1/start press]");
  expect(optedIn.press("c1/start").ok).toBe(true);
  expect(optedIn.act({ address: "c1/other", action: "press" }).ok).toBe(false);
});

const pickMeta = {
  draw: { kind: "pick", press: "spin", pool: "options", repeat: "repeat", reset: "reset" },
  actions: { parts: { spin: ["press"], reset: ["press"] } },
  emptyActions: ["spin.press"],
  confirmParts: ["reset"],
} as const satisfies Partial<Meta>;
const pickProps = z.strictObject({ options: z.array(z.string()).min(2).max(3), repeat: z.boolean() });
it("exhausts a nonrepeating pool and restores it only after reset is confirmed", () => {
  const { runtime, random, result } = run(pickMeta, pickProps, { options: ["A", "B"], repeat: false });
  expect(runtime.read()).toContain("remaining=2");
  expect(runtime.press("c1/spin").ok).toBe(true);
  expect(runtime.press("c1/spin").ok).toBe(true);
  expect(result()).toEqual({ kind: "pick", index: 1, used: [0, 1], remaining: 0 });
  expect(runtime.read()).toContain("index=1 — used=[0,1] — remaining=0");
  expect(runtime.canPress("c1/spin")).toBe(false);
  expect(runtime.act({ address: "c1/spin", action: "press" }).ok).toBe(false);
  expect(runtime.press("c1/reset").ok).toBe(true);
  expect(result()).toMatchObject({ remaining: 0 });
  expect(runtime.press("confirm/confirm").ok).toBe(true);
  expect(result()).toEqual({ kind: "pick", used: [], remaining: 2 });
  expect(runtime.read()).toContain("ChanceFixture (empty) used=[] remaining=2 [c1/spin press]");
  expect(random).toHaveBeenCalledTimes(1);
});

it("allows repeated draws from a success state and hides reset", () => {
  const { runtime, random, result } = run(
    pickMeta,
    pickProps,
    { options: ["A", "B"], repeat: true },
    "success",
    [0, 0],
  );
  expect(runtime.canPress("c1/reset")).toBe(false);
  for (let i = 0; i < 2; i++) expect(runtime.press("c1/spin").ok).toBe(true);
  expect(result()).toEqual({ kind: "pick", index: 0, used: [], remaining: 2 });
  expect(random).toHaveBeenCalledTimes(2);
});

const teamMeta = {
  draw: {
    kind: "partition",
    press: "make",
    redraw: "remake",
    players: "players",
    teams: "teams",
    locked: "team",
  },
  actions: { parts: { make: ["press"], remake: ["press"] } },
  emptyActions: ["make.press"],
  confirmParts: ["remake"],
} as const satisfies Partial<Meta>;
const teamProps = z.strictObject({
  players: z
    .array(z.strictObject({ team: z.int().optional() }))
    .min(2)
    .max(12),
  teams: z.array(z.string()).min(2).max(4),
});

it("projects locked assignments and offers a confirmed redraw only after grouping", () => {
  const { runtime, random, result } = run(teamMeta, teamProps, {
    players: [{ team: 0 }, { team: 0 }, {}, {}],
    teams: ["A", "B"],
  });
  expect(runtime.canPress("c1/remake")).toBe(false);
  expect(runtime.press("c1/make").ok).toBe(true);
  expect(result()).toEqual({ kind: "partition", teams: [0, 0, 1, 1] });
  expect(runtime.read()).toContain("teams=[0,0,1,1] [c1/remake press]");
  expect(runtime.canPress("c1/make")).toBe(false);
  expect(runtime.press("c1/remake").ok).toBe(true);
  expect(random).toHaveBeenCalledTimes(1);
  expect(runtime.press("confirm/confirm").ok).toBe(true);
  expect(random).toHaveBeenCalledTimes(2);
});

it("projects an error for impossible locks without accepting a draw", () => {
  const { runtime, random } = run(teamMeta, teamProps, {
    players: [{ team: 0 }, { team: 0 }, { team: 0 }, {}],
    teams: ["A", "B"],
  });
  expect(runtime.snapshotScreen().components[0]?.state).toBe("error");
  expect(runtime.read()).toBe("screen s\nc1 ChanceFixture (error)");
  expect(runtime.act({ address: "c1/make", action: "press" }).ok).toBe(false);
  expect(random).not.toHaveBeenCalled();
});

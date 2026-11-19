import { expect, it } from "vitest";
import { z } from "zod";
import { drawState, type Definition, type Values } from "../../../catalog";
import { createInteractionStore, createScreenController } from "../index";

const base = {
  id: "ChanceFixture",
  group: "action",
  purpose: "Exercise reloaded outcomes.",
  pick: "A fixture for runtime tests.",
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "Draw and retain a result.",
} as const;

function open(
  store: ReturnType<typeof createInteractionStore>,
  def: Definition,
  input: Values,
  words: number[],
) {
  return createScreenController({
    screen: { id: "s", components: [{ ...input, c: base.id, id: "c1", state: "empty" }] },
    defs: { [base.id]: def },
    store,
    random: () => words.shift()!,
  });
}

it("retains an exhausted pool across reopen but resets it when options change", () => {
  const store = createInteractionStore();
  const options = [{ label: "A" }, { label: "B" }];
  const def: Definition = {
    meta: {
      ...base,
      draw: { kind: "pick", press: "spin", pool: "options", repeat: "repeat" },
      items: { key: "options", parts: ["root"] },
      actions: { parts: { spin: ["press"] } },
      emptyActions: ["spin.press"],
    },
    props: z.strictObject({ options: z.array(z.strictObject({ label: z.string() })), repeat: z.boolean() }),
    examples: [],
    fallback: () => ({ options, repeat: false }),
    probes: [],
  };
  const input = { options, repeat: false };
  const before = open(store, def, input, [1]);
  expect(before.press("c1/spin").ok).toBe(true);
  expect(before.press("c1/spin").ok).toBe(true);
  expect(open(store, def, input, []).canPress("c1/spin")).toBe(false);
  const expanded = { ...input, options: [...options, { label: "C" }] };
  const after = open(store, def, expanded, [2]);
  expect(after.snapshotScreen().components[0]?.state).toBe("empty");
  expect(after.read()).toContain("remaining=3");
  expect(after.press("c1/spin").ok).toBe(true);
  expect(after.read()).toContain("index=2 — used=[2] — remaining=2");
});

it("supports item-root holds and clears them when die sides change", () => {
  const store = createInteractionStore();
  const def: Definition = {
    meta: {
      ...base,
      draw: { kind: "faces", press: "roll", count: "count", sides: "sides", hold: "root" },
      items: { key: "dice", parts: ["root"], prefix: "d" },
      actions: { parts: { roll: ["press"] }, items: { root: ["toggle"] } },
      emptyActions: ["roll.press"],
    },
    props: z.strictObject({ count: z.int().min(1).max(6), sides: z.int().min(2).max(20) }),
    examples: [],
    fallback: () => ({ count: 2, sides: 6 }),
    probes: [],
  };
  const input = { count: 2, sides: 20 };
  const before = open(store, def, input, [19, 2, 3]);
  expect(before.press("c1/roll").ok).toBe(true);
  expect(before.act({ address: "s/c1/d1/root", action: "toggle" }).ok).toBe(true);
  expect(before.press("c1/roll").ok).toBe(true);
  expect(before.read()).toContain("faces=[20,4] — held=[true,false]");
  const smaller = { ...input, sides: 6 };
  const after = open(store, def, smaller, [1, 5]);
  expect(drawState(def.meta, smaller, (part) => store.get(`s/c1/${part}`))).toMatchObject({
    faces: [],
    held: [],
  });
  expect(after.canPress("c1/d1")).toBe(false);
  expect(after.press("c1/roll").ok).toBe(true);
  expect(after.read()).toContain("faces=[2,6] — held=[false,false]");
});

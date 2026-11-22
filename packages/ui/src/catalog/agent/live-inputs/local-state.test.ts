import { expect, it } from "vitest";
import { z } from "zod";
import { defineLocalState, planAct, readScreen, text, type Definition, type Meta } from "../../index";

const schema = z.strictObject({
  count: z.number().int().min(0).max(3),
  last: z.string().max(8),
  hidden: z.string().max(20),
});
const meta = {
  id: "LocalFixture",
  group: "input",
  purpose: "Stage local edits",
  pick: "Stage local edits",
  region: "body",
  weight: 1,
  tier: "phone",
  realPath: "Local control",
  items: { key: "rows", parts: ["root"] },
  actions: {
    parts: { type: ["type"], add: ["increment"], clear: ["press"] },
    items: { root: ["press"] },
    when: { clear: { hasEdits: true } },
  },
  live: { derive: (props) => ({ hasEdits: Number(props.count) > 0 }) },
  localState: defineLocalState({
    schema,
    initial: (seed) => ({ count: Number(seed.start), last: "", hidden: "private answer" }),
    events: ["type.type", "add.increment", "clear.press"],
    itemEvents: ["root.press"],
    reduce: (state, event) => {
      if (event.part === "clear") return { state: { ...state, count: 0, last: "" } };
      if (event.value === "reject") return { error: "That input is not accepted" };
      return { state: { ...state, count: state.count + 1, last: String(event.item ?? event.value ?? "") } };
    },
    project: ({ count, last }) => {
      if (last === "broken") throw new Error("private diagnostic");
      return { count, last };
    },
  }),
  read: (input) => {
    const { count, last } = input as { count: number; last: string };
    return [`count ${count}`, `last ${JSON.stringify(last)}`];
  },
} satisfies Meta;
const props = z.strictObject({
  start: z.number().int().min(0).max(3),
  rows: z.array(z.strictObject({ label: text(20), goto: z.string() })),
});
const seed = {
  start: 0,
  rows: [
    { label: "First", goto: "away" },
    { label: "Second", goto: "away" },
  ],
};
const defs = {
  LocalFixture: { meta, props, fallback: () => seed, examples: [], probes: [] },
} satisfies Record<string, Definition>;
const screen = {
  id: "home",
  components: ["a", "b"].map((id) => ({ id, c: meta.id, ...seed })),
};
const type = (value: string) => ({ address: "a/type", action: "type", value });
const add = { address: "a/add", action: "increment" };
const pick = { address: "a/r2", action: "press" };
const clear = { address: "a/clear", action: "press" };

it("reduces declared component and addressed row events together, without links or private read fields", () => {
  expect(readScreen(screen, defs)).not.toContain("[a/clear");
  expect(planAct(screen, defs, {}, [clear])).toMatchObject({ ok: false, code: "not_actionable" });
  const result = planAct(screen, defs, {}, [type("safe"), clear, add, pick]);
  if (!result.ok) throw new Error(result.code);
  expect(result.links).toEqual([]);
  expect(result.changed).toEqual(["a/type type", "a/clear press", "a/add increment", "a/r2 press"]);
  const read = readScreen(screen, defs, result.values);
  expect(read).toContain('a LocalFixture count 2 — last "r2"');
  expect(read).toContain("[a/clear press]");
  expect(read).toContain('b LocalFixture count 0 — last ""');
  expect(read).not.toContain("private answer");
  expect(read).not.toContain("→away");
});

it("reads a different seed without mutation and replaces progress on its first commit", () => {
  const before = planAct(screen, defs, {}, [type("kept")]);
  if (!before.ok) throw new Error(before.code);
  const refreshed = { ...screen, components: screen.components.map((entry) => ({ ...entry, start: 1 })) };
  expect(readScreen(refreshed, defs, before.values)).toContain('a LocalFixture count 1 — last ""');
  expect(readScreen(screen, defs, before.values)).toContain('a LocalFixture count 1 — last "kept"');
  const after = planAct(refreshed, defs, before.values, [add]);
  if (!after.ok) throw new Error(after.code);
  expect(readScreen(refreshed, defs, after.values)).toContain('a LocalFixture count 2 — last ""');
  expect(readScreen(screen, defs, after.values)).toContain('a LocalFixture count 0 — last ""');
});

it("rejects invalid state and projection without committing any earlier event", () => {
  const before = planAct(screen, defs, {}, [type("kept")]);
  if (!before.ok) throw new Error(before.code);
  for (const [steps, hint] of [
    [[add, add, add], "Invalid local state"],
    [[add, type("too long to store")], "Invalid local state"],
    [[add, type("broken")], "Invalid local state"],
    [[add, type("reject")], "That input is not accepted"],
  ] as const) {
    expect(planAct(screen, defs, before.values, [...steps])).toEqual({
      ok: false,
      at: steps.length - 1,
      code: "invalid_value",
      hint,
    });
    expect(readScreen(screen, defs, before.values)).toContain('a LocalFixture count 1 — last "kept"');
  }
});

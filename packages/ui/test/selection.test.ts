import { z } from "zod";
import { describe, expect, it } from "vitest";
import {
  components,
  readPrompt,
  planAct,
  projectSelection,
  readScreen,
  selectionChanges,
  selectionError,
  text,
  type Definition,
  type Meta,
  type ScreenLike,
} from "@lmthing/ui/catalog";
import { createAgentAccess, createInteractionStore, createScreenController } from "@lmthing/ui/kit";
import { selectedIds } from "../scripts/build";

const base: Meta = {
  id: "Fixture",
  group: "input",
  purpose: "Choose an option",
  pick: "Choose an option",
  region: "body",
  weight: 1,
  tier: "phone",
  realPath: "Local selection",
  items: { key: "rows", parts: ["root"] },
  parts: ["root", "anyone"],
  actions: { items: { root: ["select"] }, parts: { anyone: ["select"] } },
};
function definition(select: NonNullable<Meta["select"]>): Definition {
  return {
    meta: { ...base, select, read: (props) => [`chosen ${String((props as { at?: unknown }).at)}`] },
    props: z.strictObject({
      rows: z.array(z.strictObject({ label: text(20), time: text(5), chosen: z.boolean().optional() })),
      at: z.union([z.number(), z.string()]).optional(),
    }),
    fallback: () => ({ rows: [] }),
    examples: [],
    probes: [],
  };
}
const rows = [
  { label: "First", time: "09:00" },
  { label: "Second", time: "10:00" },
];
function setup(select: NonNullable<Meta["select"]>, mounted: boolean) {
  const defs = { Fixture: definition(select) };
  const screen: ScreenLike = { id: "test", components: [{ id: "f1", c: "Fixture", rows }] };
  const runtime = mounted ? createScreenController({ screen, defs }) : undefined;
  const store = runtime?.store ?? createInteractionStore();
  return {
    runtime,
    store,
    agent: createAgentAccess({ defs, current: () => screen, store, ...(runtime ? { runtime } : {}) }),
  };
}

describe.each([true, false])("selection with controller: %s", (mounted) => {
  it.each([
    { select: { prop: "at", value: "index" } as const, first: 0, second: 1 },
    { select: { prop: "at", value: "position", parts: { anyone: 0 } } as const, first: 1, second: 2 },
    { select: { prop: "at", value: { field: "time" } } as const, first: "09:00", second: "10:00" },
  ])("infers $select.value and updates read after every change", ({ select, first, second }) => {
    const { runtime, agent, store } = setup(select, mounted);
    for (const [address, expected] of [
      ["f1/r1", first],
      ["test/f1/r2/root", second],
      ["f1/r1", first],
    ] as const) {
      expect(agent.act({ address, action: "select" }).ok).toBe(true);
      expect(agent.read()).toContain(`chosen ${expected}`);
      expect(store.get("test/f1/$at")).toBe(expected);
      if (runtime) expect(runtime.snapshotScreen().components[0]!.at).toBe(expected);
    }
    expect(agent.read()).not.toContain(`[f1/r2 select = ${JSON.stringify(second)}]`);
    if ("parts" in select) {
      expect(agent.act({ address: "f1/anyone", action: "select" }).ok).toBe(true);
      expect(agent.read()).toContain("chosen 0");
      expect(agent.act({ address: "f1/r2", action: "select", value: 2 }).ok).toBe(true);
      expect(agent.read()).toContain("chosen 2");
    }
    runtime?.dispose();
  });
  it("rejects wrong explicit values atomically and accepts matching field values", () => {
    const { runtime, agent, store } = setup({ prop: "at", value: { field: "time" } }, mounted);
    expect(agent.act({ address: "f1/r2", action: "select", value: "10:00" }).ok).toBe(true);
    const before = store.snapshot();
    expect(
      agent.act([
        { address: "f1/r1", action: "select" },
        { address: "f1/r2", action: "select", value: "09:00" },
      ]),
    ).toMatchObject({ ok: false, code: "invalid_value", at: 1 });
    expect(store.snapshot()).toEqual(before);
    expect(agent.read()).toContain("chosen 10:00");
    runtime?.dispose();
  });
  it("sets and resets every declared row flag", () => {
    const { runtime, agent, store } = setup({ prop: "chosen", value: "index", mode: "flags" }, mounted);
    for (const index of [1, 0, 1]) {
      expect(agent.act({ address: `f1/r${index + 1}`, action: "select" }).ok).toBe(true);
      expect([store.get("test/f1/r1"), store.get("test/f1/r2")]).toEqual([index === 0, index === 1]);
      if (runtime)
        expect(
          (runtime.snapshotScreen().components[0]!.rows as { chosen: boolean }[]).map((row) => row.chosen),
        ).toEqual([index === 0, index === 1]);
    }
    runtime?.dispose();
  });
});

it("keeps every core read probe prompt identical when selection metadata is present", () => {
  for (const id of selectedIds(["Calendar", "Choice", "Segmented", "TabBar", "Sheet", "Chips"] as const)) {
    const def = components[id];
    const { select: _select, ...meta } = def.meta;
    for (const probe of def.probes) {
      if (probe.kind !== "read") continue;
      const instance = probe.expect.address.split("/")[0]!;
      expect(readPrompt(def, probe.screen, instance, probe.task)).toBe(
        readPrompt({ ...def, meta }, probe.screen, instance, probe.task),
      );
    }
  }
});

const namedFixture = definition({ prop: "at", value: "index" });

it("stages independent offers in order and rejects schema conflicts atomically", () => {
  const def = {
    ...namedFixture,
    meta: {
      ...namedFixture.meta,
      selections: {
        mode: { prop: "mode", choices: ["simple", "custom"] },
        method: { prop: "method", choices: { prop: "methods" } },
      },
      actions: { parts: { mode: ["select"], method: ["select"], apply: ["press"] } },
      partTiersBy: { apply: { prop: "method", tiers: { other: "service" } } },
    },
    props: z
      .strictObject({ mode: z.string(), method: z.string() })
      .refine(({ mode, method }) => mode !== "simple" || method !== "other")
      .overwrite((input) => ({ ...input, methods: input.mode === "custom" ? ["base", "other"] : [] })),
  } satisfies Definition;
  const current = { id: "test", components: [{ id: "p1", c: def.meta.id, mode: "simple", method: "base" }] };
  const defs = { [def.meta.id]: def };
  const mode = (value: string) => ({ address: "p1/mode", action: "select", value });
  const method = { address: "p1/method", action: "select", value: "other" };
  const initial = {};
  expect(planAct(current, defs, initial, [method])).toMatchObject({ ok: false, code: "not_actionable" });
  expect(planAct(current, defs, initial, [mode("custom"), method, mode("simple")])).toMatchObject({
    ok: false,
    code: "invalid_value",
    at: 2,
  });
  expect(initial).toEqual({});
  expect(readScreen(current, defs)).toContain("[p1/apply press]");
  const plan = planAct(current, defs, initial, [mode("custom"), method]);
  expect(plan).toMatchObject({
    ok: true,
    values: { "test/p1/$mode": "custom", "test/p1/$method": "other" },
  });
  if (!plan.ok) return;
  const read = readScreen(current, defs, plan.values);
  expect(read).toContain('[p1/mode select = "custom"; choices ["simple","custom"]]');
  expect(read).toContain('[p1/method select = "other"; choices ["base","other"]]');
  expect(read).toContain("[p1/apply press !needs-service]");
});

it("stores named selections independently, without clearing legacy row selections", () => {
  const declared = {
    ...namedFixture.meta,
    selections: {
      layout: { prop: "layout", choices: { prop: "layouts" } },
      method: { prop: "method", choices: ["first", "second"] },
    },
  } satisfies Meta;
  const input = { rows, layouts: ["wide", "narrow"], layout: "wide", method: "first" };
  const values = {
    ...selectionChanges(declared, input, "r2"),
    ...selectionChanges(declared, input, "layout", "narrow"),
    ...selectionChanges(declared, input, "method", "second"),
  };
  expect(values).toMatchObject({ r2: 1, layout: "narrow", method: "second" });
  expect(projectSelection(declared, input, (part) => values[part])).toEqual({
    ...input,
    at: 1,
    layout: "narrow",
    method: "second",
  });
  expect(selectionChanges(declared, input, "method", "wide")).toEqual({});
  expect(selectionError(declared, input, "layout", undefined)).toBe(
    "Select an allowed value at this address",
  );
});

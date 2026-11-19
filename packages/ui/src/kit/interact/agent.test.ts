import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { components, type Definition, type ScreenLike } from "@lmthing/ui/catalog";
import { createAgentAccess } from "./agent";
import { createScreenController } from "./controller";
import { createInteractionStore } from "./store";

const screen: ScreenLike = {
  id: "home",
  components: [
    { id: "l1", c: "List", rows: [{ title: "Fern", trail: "toggle", goto: "fern" }, { title: "Basil" }] },
    { id: "b1", c: "Button", label: "Log watering" },
  ],
};

function access() {
  const links: string[] = [];
  const store = createInteractionStore();
  const agent = createAgentAccess({
    defs: components,
    store,
    current: () => screen,
    onLink: (goto) => links.push(goto),
  });
  return { agent, store, links };
}

describe("agent access", () => {
  it("toggles a part and reads it back", () => {
    const { agent, store } = access();
    expect(agent.act({ address: "home/l1/r1/trail", action: "toggle" })).toMatchObject({ ok: true });
    expect(store.get("home/l1/r1/trail")).toBe(true);
    expect(agent.read()).toContain("[l1/r1/trail toggle:on]");
  });
  it("follows links on press", () => {
    const { agent, links } = access();
    agent.act({ address: "l1/r1", action: "press" });
    expect(links).toEqual(["fern"]);
  });
  it("dry runs without changing anything", () => {
    const { agent, store } = access();
    const reply = agent.act({ address: "l1/r1/trail", action: "toggle" }, { dryRun: true });
    expect(reply).toMatchObject({ ok: true, dryRun: true, changed: "l1/r1/trail toggle = true" });
    expect(store.snapshot()).toEqual({});
    expect(agent.log()).toEqual([]);
  });
  it("is atomic: a bad step leaves every earlier step undone", () => {
    const { agent, store } = access();
    const reply = agent.act([
      { address: "l1/r1/trail", action: "toggle" },
      { address: "b1", action: "type", value: "x" },
    ]);
    expect(reply).toMatchObject({ ok: false, code: "not_actionable", at: 1 });
    expect(store.snapshot()).toEqual({});
  });
  it("rejects invalid values with a short hint", () => {
    const { agent } = access();
    expect(agent.act({ address: "b1", action: "press", value: 3 })).toMatchObject({
      ok: false,
      code: "invalid_value",
      hint: "press takes no value",
    });
  });
});

const matrixProps = z
  .strictObject({ rows: z.array(z.strictObject({ values: z.array(z.int().min(-999).max(999).nullable()) })) })
  .overwrite((props) => ({
    ...props,
    cells: props.rows.flatMap(({ values }) => values.map((score) => ({ score }))),
  }));
const matrix = {
  meta: {
    id: "MatrixFixture",
    group: "input",
    purpose: "Edit a number matrix.",
    pick: "A fixture for addressed cells.",
    region: "body",
    weight: 1,
    tier: "phone",
    realPath: "Local storage.",
    items: {
      key: "cells",
      parts: ["score"],
      set: {
        score: {
          prop: "score",
          min: -999,
          max: 999,
          integer: true,
          matrix: { rows: "rows", values: "values" },
        },
      },
    },
    confirmParts: ["reset"],
    clearItems: { reset: "score" },
    actions: { parts: { reset: ["press"] }, items: { score: ["set"] } },
    read: (input: unknown) => [
      JSON.stringify((input as z.output<typeof matrixProps>).rows.map((row) => row.values)),
    ],
  },
  props: matrixProps,
  fallback: () => ({}),
  examples: [],
  probes: [],
} satisfies Definition;

function matrixSetup() {
  const rows = [{ values: [4, null] }, { values: [null, 5] }];
  const screen = { id: "game", components: ["s1", "s2"].map((id) => ({ id, c: matrix.meta.id, rows })) };
  const defs = { [matrix.meta.id]: matrix };
  const onAction = vi.fn();
  const runtime = createScreenController({ screen, defs, onAction });
  const agent = createAgentAccess({ current: () => screen, defs, store: runtime.store, runtime });
  const snapshot = (index = 0) => runtime.snapshotScreen().components[index]?.rows;
  return { agent, runtime, snapshot, rows, onAction };
}
const edit = (address: string, value: unknown) => ({ address, value, action: "set" });
const reset = { address: "s1/reset", action: "press" };
const confirm = { address: "confirm/confirm", action: "press" };

it("validates integer cell bounds and projects edits into the wire matrix and read", () => {
  const { agent, snapshot, rows, onAction } = matrixSetup();
  for (const invalid of [-1000, 1000, 1.5, "20", Infinity, null])
    expect(agent.act(edit("s1/r2/score", invalid))).toMatchObject({ ok: false, code: "invalid_value" });
  expect(agent.act(edit("s1/r5/score", 1))).toMatchObject({ ok: false, code: "not_actionable" });
  expect(onAction).not.toHaveBeenCalled();
  expect(agent.act([edit("s1/r2/score", -999), edit("s1/r3/score", 999)])).toMatchObject({ ok: true });
  expect(snapshot()).toEqual([{ values: [4, -999] }, { values: [999, 5] }]);
  expect(agent.read()).toContain("[[4,-999],[999,5]]");
  expect(rows).toEqual([{ values: [4, null] }, { values: [null, 5] }]);
});

it("clears only the confirmed component, leaves cancelled edits intact and rolls back failed batches", () => {
  const { agent, runtime, snapshot, rows } = matrixSetup();
  expect(agent.act(edit("s1/r1/score", 17))).toMatchObject({ ok: true });
  expect(agent.act(reset)).toMatchObject({ ok: true });
  expect(runtime.confirmation).toBeDefined();
  const edited = [{ values: [17, null] }, { values: [null, 5] }];
  expect(snapshot()).toEqual(edited);
  expect(agent.act({ address: "confirm/cancel", action: "dismiss" })).toMatchObject({ ok: true });
  expect(snapshot()).toEqual(edited);
  expect(agent.act([reset, confirm, edit("s1/r1/score", 1000)])).toMatchObject({ ok: false, at: 2 });
  expect(runtime.confirmation).toBeUndefined();
  expect(snapshot()).toEqual(edited);
  expect(agent.act([reset, confirm])).toMatchObject({ ok: true });
  expect(snapshot()).toEqual([{ values: [null, null] }, { values: [null, null] }]);
  expect(agent.read()).toContain("[[null,null],[null,null]]");
  expect(snapshot(1)).toEqual(rows);
  expect(agent.act(edit("s1/r4/score", 0))).toMatchObject({ ok: true });
  expect(snapshot()).toEqual([{ values: [null, null] }, { values: [null, 0] }]);
});

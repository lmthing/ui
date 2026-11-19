import { expect, it } from "vitest";
import { z } from "zod";
import { readComponent, readScreen, type Definition, text } from "../index";
import { planAct } from "./act";
import { affordancesOf } from "./affordances";
import { controlValueKey, parseControlProps } from "./live-props";

const parts = ["root", "roll", "reset", "restart", "reverse", "remake", "r", "r1x", "r1_suffix"];
const props = z.strictObject({
  rows: z
    .array(z.strictObject({ label: text(24) }))
    .min(0)
    .max(12),
});
const fixture = {
  meta: {
    id: "ReaderFixture",
    group: "action",
    purpose: "Read addressed actions.",
    pick: "A reader regression fixture.",
    region: "body",
    weight: 2,
    tier: "phone",
    realPath: "A bounded local fixture.",
    parts,
    items: { key: "rows", parts: ["root", "score"] },
    actions: {
      parts: Object.fromEntries(parts.map((part) => [part, ["press"] as const])),
      items: { root: ["press"], score: ["set"] },
    },
  },
  props,
  fallback: () => ({ rows: [] }),
  examples: [{ rows: [{ label: "First" }] }],
  probes: [],
} satisfies Definition;

it.each(["c1", "home/game_one"])("keeps r-prefixed controls on %s above real item actions", (instance) => {
  const rows = Array.from({ length: 12 }, (_, index) => ({ label: String(index + 1) }));
  const [head, ...items] = readComponent(fixture, { rows }, instance);
  for (const part of parts) {
    const address = part === "root" ? instance : `${instance}/${part}`;
    expect(head).toContain(`[${address} press]`);
  }
  expect(items).toHaveLength(12);
  for (let index = 0; index < rows.length; index++) {
    const address = `${instance}/r${index + 1}`;
    expect(head).not.toContain(`[${address} press]`);
    expect(head).not.toContain(`[${address}/score set]`);
    expect(items[index]).toContain(`[${address} press]`);
    expect(items[index]).toContain(`[${address}/score set]`);
  }
});

it("retains top-level r-prefixed controls when the runtime item array is empty", () => {
  const lines = readComponent(fixture, { rows: [] }, "c1");
  expect(lines).toHaveLength(1);
  for (const part of parts) expect(lines[0]).toContain(`[${part === "root" ? "c1" : `c1/${part}`} press]`);
});

it("still omits all controls in a non-filled state", () => {
  expect(readComponent(fixture, fixture.examples[0], "c1", "loading")).toEqual([
    "c1 ReaderFixture (loading)",
  ]);
});

it("recomputes derived choices from a staged item edit in a pure reader and planner", () => {
  const def = {
    ...fixture,
    meta: {
      ...fixture.meta,
      items: {
        key: "cells",
        parts: ["score"],
        set: { score: { prop: "score", min: 0, max: 10, matrix: { rows: "rows", values: "points" } } },
      },
      select: { prop: "mode", choices: { pick: { prop: "modes" } } },
      actions: { parts: { pick: ["select"] }, items: { score: ["set"] } },
    },
    props: z
      .strictObject({
        mode: z.string(),
        rows: z.array(z.strictObject({ points: z.array(z.number().nullable()) })),
      })
      .overwrite((input) => ({
        ...input,
        cells: input.rows.flatMap(({ points }) => points.map((score) => ({ score }))),
        modes: input.rows.some(({ points }) => points.some((value) => value !== null))
          ? ["edit", "review"]
          : [],
      })),
  } satisfies Definition;
  const seed = { mode: "edit", rows: [{ points: [null] }] };
  const current = { id: "test", components: [{ id: "p1", c: def.meta.id, ...seed }] };
  const defs = { [def.meta.id]: def };
  expect(readScreen(current, defs)).not.toContain("p1/pick select");
  const get = (part: string) => (part === controlValueKey(def, "r1/$adjust/score") ? 5 : undefined);
  expect(parseControlProps(def, seed, get).modes).toEqual(["edit", "review"]);
  const steps = [
    { address: "p1/r1/score", action: "set", value: 5 },
    { address: "p1/pick", action: "select", value: "review" },
  ];
  const plan = planAct(current, defs, {}, steps);
  expect(plan).toMatchObject({ ok: true });
  if (plan.ok)
    expect(readScreen(current, defs, plan.values)).toContain('select = "review"; choices ["edit","review"]');
});

it("does not offer shared nudges past the pure reader's bound", () => {
  const meta = {
    ...fixture.meta,
    items: {
      key: "rows",
      parts: ["points", "plus"],
      set: { points: { prop: "amount", max: 30 } },
      adjust: { "plus.increment": { prop: "amount", delta: 0.5 } },
    },
    actions: { items: { points: ["set"], plus: ["increment"] } },
  } satisfies Definition["meta"];
  const props = { rows: [{ id: "r1", amount: 20 }] };
  expect(affordancesOf(meta, props, "p1").map(({ action }) => action)).toEqual(["set", "increment"]);
  const values = { "p1/r1/$adjust/amount": 30 };
  expect(affordancesOf(meta, props, "p1", values).map(({ action }) => action)).toEqual(["set"]);
});

it("resolves ordinary row payloads from the current wire after a numeric set", () => {
  const def = {
    ...fixture,
    meta: {
      ...fixture.meta,
      select: { prop: "mode", value: { field: "option" } },
      set: { amount: { prop: "amount" } },
      actions: { parts: { amount: ["set"] }, items: { root: ["select"] } },
    },
    props: z
      .strictObject({ mode: z.string(), amount: z.number() })
      .overwrite((input) => ({ ...input, rows: [{ option: input.amount ? "new" : "old" }] })),
  } satisfies Definition;
  const current = { id: "test", components: [{ id: "p1", c: def.meta.id, amount: 0, mode: "old" }] };
  expect(
    planAct(current, { [def.meta.id]: def }, {}, [
      { address: "p1/amount", action: "set", value: 1 },
      { address: "p1/r1", action: "select" },
    ]),
  ).toMatchObject({ ok: true, values: { "test/p1/$mode": "new" } });
});

it("rederives prop-backed choices from a nested control edit", () => {
  const def = {
    ...fixture,
    meta: {
      ...fixture.meta,
      items: {
        key: "rows",
        parts: ["root"],
        nested: { key: "children", parts: { toggle: { action: "toggle", prop: "on" } } },
      },
      select: { prop: "mode", choices: { pick: { prop: "modes" } } },
      actions: { parts: { pick: ["select"] } },
    },
    props: z
      .strictObject({
        mode: z.string(),
        rows: z.array(z.strictObject({ children: z.array(z.strictObject({ on: z.boolean() })) })),
      })
      .overwrite((input) => ({ ...input, modes: input.rows[0]?.children[0]?.on ? ["off", "on"] : ["off"] })),
  } satisfies Definition;
  const current = {
    id: "test",
    components: [{ id: "p1", c: def.meta.id, mode: "off", rows: [{ children: [{ on: false }] }] }],
  };
  const defs = { [def.meta.id]: def };
  const plan = planAct(current, defs, {}, [
    { address: "p1/r1/toggle_1", action: "toggle", value: true },
    { address: "p1/pick", action: "select", value: "on" },
  ]);
  expect(plan).toMatchObject({ ok: true });
  if (plan.ok)
    expect(readScreen(current, defs, plan.values)).toContain('select = "on"; choices ["off","on"]');
});

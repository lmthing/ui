import { expect, it } from "vitest";
import { z } from "zod";
import type { Definition } from "../../probes";
import { planAct, projectControlInput, readScreen, type ActStep } from "../index";

const child = z.strictObject({
  enabled: z.boolean(),
  on: z.boolean(),
  chosen: z.enum(["a", "b", "c"]),
  bin: z.enum(["x", "y"]),
});
const def = {
  meta: {
    id: "NestedFixture",
    group: "input",
    purpose: "Choose within groups.",
    pick: "Fixture.",
    region: "body",
    weight: 1,
    tier: "phone",
    realPath: "Local.",
    items: {
      key: "rows",
      parts: ["root"],
      nested: {
        key: "children",
        groups: {
          capacity: { mode: "multi", max: { prop: "limit" }, by: "bin" },
        },
        parts: {
          pick: { action: "toggle", prop: "on", group: "capacity", when: "enabled" },
          alternate: { action: "toggle", prop: "on", when: "enabled" },
          choice: { action: "select", prop: "chosen", choices: { prop: "choices", from: "parent" } },
          open: { action: "press", prop: "enabled", when: { prop: "enabled", equals: true } },
        },
      },
    },
  },
  props: z.strictObject({
    rows: z.array(
      z.strictObject({
        children: z.array(child),
        limit: z.int().nonnegative(),
        choices: z.array(z.strictObject({ value: z.string(), label: z.string() })),
      }),
    ),
  }),
  fallback: () => ({}),
  examples: [],
  probes: [],
} satisfies Definition;
const childAt = (bin: "x" | "y", on = false, enabled = true) => ({ enabled, on, bin, chosen: "a" });
const seed = {
  id: "c1",
  c: def.meta.id,
  rows: [
    {
      limit: 1,
      choices: [
        { value: "a", label: "Alpha" },
        { value: "b", label: "Beta" },
      ],
      children: [childAt("x", true), childAt("x"), childAt("y"), childAt("y", false, false)],
    },
    {
      limit: 2,
      choices: [
        { value: "a", label: "Alpha" },
        { value: "c", label: "Gamma" },
      ],
      children: [childAt("x"), childAt("x"), childAt("x")],
    },
  ],
};
const screen = { id: "home", components: [seed] };
const defs = { NestedFixture: def };
const act = (target: string, action: string, value?: unknown): ActStep => ({
  address: `c1/${target}`,
  action,
  value,
});

it("uses parent-specific closed choices and exposes only real, enabled presses", () => {
  const read = readScreen(screen, defs);
  expect(read).toContain('[c1/r1/choice_1 select = "Alpha"; choices ["Alpha","Beta"]]');
  expect(read).toContain('[c1/r2/choice_1 select = "Alpha"; choices ["Alpha","Gamma"]]');
  expect(read).toContain("[c1/r1/open_3 press]");
  expect(read).not.toContain("[c1/r1/open_4");
  expect(planAct(screen, defs, {}, [act("r1/open_3", "press")])).toMatchObject({ ok: true });
  for (const part of ["open_4", "open_5"])
    expect(planAct(screen, defs, {}, [act(`r1/${part}`, "press")])).toMatchObject({ ok: false });
  for (const value of [undefined, "Gamma", "c"])
    expect(planAct(screen, defs, {}, [act("r1/choice_1", "select", value)])).toMatchObject({
      ok: false,
      code: "invalid_value",
    });
  const result = planAct(screen, defs, {}, [
    act("r1/choice_1", "select", "Beta"),
    act("r2/choice_2", "select", "c"),
  ]);
  if (!result.ok) throw new Error(JSON.stringify(result));
  const edited = readScreen(screen, defs, result.values);
  expect(edited).toContain('[c1/r1/choice_1 select = "Beta"; choices ["Alpha","Beta"]]');
  expect(edited).toContain('[c1/r2/choice_2 select = "Gamma"; choices ["Alpha","Gamma"]]');
});

it("counts aliased toggles once and enforces independent bounds by parent and partition", () => {
  const read = readScreen(screen, defs);
  expect(read).not.toContain("r1/pick_2");
  expect(read).not.toContain("r1/alternate_2");
  expect(read).toContain("r1/pick_3");
  expect(read).toContain("r2/pick_2");
  const values = {};
  const choices = [act("r1/pick_3", "toggle"), act("r2/alternate_1", "toggle"), act("r2/pick_2", "toggle")];
  expect(planAct(screen, defs, values, [...choices, act("r2/pick_3", "toggle")])).toMatchObject({
    ok: false,
    at: 3,
    code: "max_active",
  });
  expect(values).toEqual({});
  const plan = planAct(screen, defs, values, [
    ...choices,
    act("r1/alternate_1", "toggle", false),
    act("r1/pick_2", "toggle"),
  ]);
  if (!plan.ok) throw new Error(JSON.stringify(plan));
  const filled = readScreen(screen, defs, plan.values);
  expect(filled).toContain("[c1/r1/alternate_2 toggle:on]");
  expect(filled).toContain("[c1/r2/alternate_1 toggle:on]");
  expect(filled).not.toContain("[c1/r2/pick_3");
});

it("replaces a single choice atomically without clearing other partitions or a locked member", () => {
  const nested = def.meta.items.nested;
  const single = {
    ...def,
    meta: {
      ...def.meta,
      items: {
        ...def.meta.items,
        nested: {
          ...nested,
          groups: { capacity: { mode: "single", by: "bin" } } as const,
        },
      },
    },
  };
  const singleDefs = { NestedFixture: single };
  const plan = planAct(screen, singleDefs, {}, [act("r1/pick_3", "toggle"), act("r1/pick_2", "toggle")]);
  if (!plan.ok) throw new Error(JSON.stringify(plan));
  const read = readScreen(screen, singleDefs, plan.values);
  expect(read).toContain("[c1/r1/pick_1 toggle:off]");
  expect(read).toContain("[c1/r1/pick_2 toggle:on]");
  expect(read).toContain("[c1/r1/pick_3 toggle:on]");
  const locked = { ...seed.rows[0]!, children: [childAt("x", true, false), childAt("x")] };
  const refreshed = { ...screen, components: [{ ...seed, rows: [locked] }] };
  expect(readScreen(refreshed, singleDefs)).not.toContain("r1/pick_2");
  expect(planAct(refreshed, singleDefs, {}, [act("r1/pick_2", "toggle")])).toMatchObject({
    ok: false,
    code: "max_active",
  });
});

it("uses defaulted choices for validated wire edits, never just a live overlay", () => {
  const parent = z
    .strictObject({
      choices: z.array(z.string()).default(["a", "b", "c"]),
      children: z.array(child.extend({ chosen: z.enum(["a", "b"]) })),
      full: z.boolean().default(false),
    })
    .refine(({ children, full }) => !full || children.every(({ chosen }) => chosen === "a"));
  const defaulted = { ...def, props: z.strictObject({ rows: z.array(parent) }) };
  const registry = { NestedFixture: defaulted };
  const raw = { rows: [{ children: [childAt("x")] }] };
  const input = { id: screen.id, components: [{ id: seed.id, c: seed.c, ...raw }] };
  const reading = readScreen(input, registry);
  expect(reading).toContain('[c1/r1/choice_1 select = "a"; choices ["a","b"]]');
  const select = (value: string) => act("r1/choice_1", "select", value);
  expect(planAct(input, registry, {}, [select("c")])).toMatchObject({ ok: false, code: "invalid_value" });
  const result = planAct(input, registry, {}, [select("b")]);
  if (!result.ok) throw new Error(JSON.stringify(result));
  const wire = projectControlInput(defaulted, raw, (part) => result.values[`home/c1/${part}`]);
  expect(defaulted.props.parse(wire).rows[0]?.children[0]?.chosen).toBe("b");
  const constrained = {
    ...input,
    components: [
      {
        ...input.components[0]!,
        rows: [{ ...raw.rows[0]!, full: true }],
      },
    ],
  };
  expect(planAct(constrained, registry, {}, [select("b")])).toMatchObject({
    ok: false,
    code: "invalid_value",
    hint: "Value conflicts with component props",
  });
});

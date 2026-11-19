import { expect, it, vi } from "vitest";
import { z } from "zod";
import { planAct, projectAdjustments, readScreen, stampItemIds, type Definition } from "../../../../catalog";
import { createScreenController } from "../../index";

const base = {
  id: "DispatchFixture",
  group: "input",
  purpose: "Edit values.",
  pick: "A controller fixture.",
  region: "body",
  weight: 1,
  tier: "phone",
  realPath: "Local controls.",
} as const;
function setup(meta: Definition["meta"], props: Definition["props"], raw: Record<string, unknown> = {}) {
  const def = { meta, props, fallback: () => raw, probes: [], examples: [] };
  const screen = { id: "test", components: [{ id: "p1", c: meta.id, ...raw }] };
  const defs = { [meta.id]: def };
  const onAction = vi.fn();
  const runtime = createScreenController({ defs, screen, onAction });
  return { runtime, screen, defs, onAction };
}
const step = (target: string, action: string, value?: unknown) => ({
  address: `p1/${target}`,
  action,
  value,
});
const accept = { address: "confirm/confirm", action: "press" };
const matrix = {
  key: "cells",
  parts: ["score"],
  set: { score: { prop: "score", matrix: { rows: "rows", values: "points" } } },
} as const;
const matrixProps = z
  .strictObject({
    mode: z.string().trim().default("edit"),
    rows: z.array(z.strictObject({ points: z.array(z.number().nullable()).default([4, 5]) })),
  })
  .overwrite((props) => ({
    ...props,
    cells: props.rows.flatMap(({ points }) => points.map((score) => ({ score }))),
  }));
const matrixMeta = {
  ...base,
  items: matrix,
  confirmParts: ["reset"],
  clearItems: { reset: "score" },
  actions: { parts: { reset: ["press"] }, items: { score: ["set"] } },
} as const satisfies Definition["meta"];

it("requires explicit confirmation even after schema normalization changes reset availability", () => {
  const { runtime, onAction } = setup(
    {
      ...matrixMeta,
      select: { prop: "mode", choices: { pick: [" clear "] } },
      actions: {
        ...matrixMeta.actions,
        parts: { pick: ["select"], reset: ["press"] },
        when: { reset: { mode: "clear" } },
      },
    },
    matrixProps,
    { rows: [{ points: [4, 5] }] },
  );
  expect(runtime.act(step("pick", "select", " clear "))).toMatchObject({ ok: true });
  onAction.mockClear();
  expect(runtime.act(step("reset", "press"))).toMatchObject({ ok: true });
  expect(runtime.confirmation?.source).toBe("test/p1/reset");
  expect(runtime.snapshotScreen().components[0]?.rows).toEqual([{ points: [4, 5] }]);
  expect(onAction).not.toHaveBeenCalled();
  expect(runtime.act(accept)).toMatchObject({ ok: true });
  expect(runtime.snapshotScreen().components[0]?.rows).toEqual([{ points: [null, null] }]);
});

it("rejects a nested control value that violates the enclosing row schema", () => {
  const { runtime, screen, defs, onAction } = setup(
    {
      ...base,
      items: {
        key: "rows",
        parts: ["root"],
        nested: { key: "children", parts: { amount: { action: "set", prop: "value", min: 0, max: 10 } } },
      },
      select: { prop: "mode", choices: { pick: ["edit"] } },
      actions: { parts: { pick: ["select"] } },
    },
    z.strictObject({
      mode: z.string(),
      rows: z.array(
        z
          .strictObject({ children: z.array(z.strictObject({ value: z.number() })) })
          .refine(({ children }) => children.every(({ value }) => value <= 5)),
      ),
    }),
    { mode: "edit", rows: [{ children: [{ value: 1 }] }] },
  );
  const edit = step("r1/amount_1", "set", 7);
  expect(planAct(screen, defs, {}, [edit])).toMatchObject({ ok: false, code: "invalid_value", at: 0 });
  expect(planAct(screen, defs, {}, [edit, step("pick", "select", "edit")])).toMatchObject({
    ok: false,
    at: 0,
  });
  expect(runtime.act(edit)).toMatchObject({ ok: false, code: "invalid_value", at: 0 });
  expect(runtime.snapshotScreen()).toEqual(screen);
  expect(onAction).not.toHaveBeenCalled();
});

it("saves edits and clears to matrices with defaulted cells inside an existing row", () => {
  const { runtime } = setup(matrixMeta, matrixProps, { rows: [{}] });
  expect(runtime.snapshotScreen().components[0]?.rows).toEqual([{}]);
  expect(runtime.act(step("r1/score", "set", 10))).toMatchObject({ ok: true });
  expect(runtime.snapshotScreen().components[0]?.rows).toEqual([{ points: [10, 5] }]);
  expect(runtime.act([step("reset", "press"), accept])).toMatchObject({ ok: true });
  expect(runtime.snapshotScreen().components[0]?.rows).toEqual([{ points: [null, null] }]);
});

it.each([
  [10, 2.46, 2.5],
  [1, 2.6, 3],
])("keeps normalized item scores in render props and reads", (scale, edit, expected) => {
  const meta = {
    ...base,
    items: {
      key: "rows",
      parts: ["amount", "plus"],
      set: { amount: { prop: "amount", max: 3 } },
      adjust: { "plus.increment": { prop: "amount", delta: 0.5 } },
    },
    actions: { items: { amount: ["set"], plus: ["increment"] } },
    read: (input: unknown) => [`Total ${(input as { total: number }).total}`],
  } as const satisfies Definition["meta"];
  const schema = z
    .strictObject({
      rows: z.array(
        z.strictObject({ amount: z.number().overwrite((value) => Math.round(value * scale) / scale) }),
      ),
    })
    .overwrite((props) => ({ ...props, total: props.rows.reduce((total, row) => total + row.amount, 0) }));
  const { runtime } = setup(meta, schema, { rows: [{ amount: 1 }] });
  expect(runtime.act(step("r1/amount", "set", edit))).toMatchObject({ ok: true });
  const { id: _id, c: _c, ...input } = runtime.snapshotScreen().components[0]!;
  const parsed = stampItemIds(meta, schema.parse(input));
  const rendered = projectAdjustments(meta, parsed, (part) => runtime.store.get(`test/p1/${part}`));
  expect(rendered.rows).toMatchObject([{ amount: expected }]);
  expect(runtime.read()).toContain(`Total ${expected}`);
  expect(runtime.read()).toContain(`[p1/r1/amount set = ${expected}]`);
  if (expected === 3) {
    expect(runtime.actionsAt("p1/r1/plus")).toEqual([]);
    expect(runtime.act(step("r1/plus", "increment"))).toMatchObject({ ok: false, code: "not_actionable" });
  }
});

it("resolves row selections against edited derived items in both planners", () => {
  const { runtime, screen, defs } = setup(
    {
      ...base,
      items: { key: "rows", parts: ["root", "amount"], set: { amount: { prop: "amount" } } },
      select: { prop: "picked", value: { field: "amount" } },
      actions: { items: { root: ["select"], amount: ["set"] } },
      read: (input) => [`Picked ${(input as { picked: number }).picked}`],
    },
    z.strictObject({ picked: z.number() }).overwrite((props) => ({ ...props, rows: [{ amount: 1 }] })),
    { picked: 1 },
  );
  const steps = [step("r1/amount", "set", 9), step("r1", "select")];
  const plan = planAct(screen, defs, {}, steps);
  expect(plan).toMatchObject({ ok: true, values: { "test/p1/$picked": 9 } });
  if (plan.ok) expect(readScreen(screen, defs, plan.values)).toContain("Picked 9");
  expect(runtime.act(steps)).toMatchObject({ ok: true });
  expect(runtime.read()).toContain("Picked 9");
});

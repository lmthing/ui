import { expect, it, vi } from "vitest";
import { z } from "zod";
import { planAct, readScreen, type Definition } from "../../../../catalog";
import { createScreenController } from "../../index";

const fixture = {
  meta: {
    id: "AdjustFixture",
    group: "input",
    purpose: "Update item quantities.",
    pick: "A bounded quantity and a separate local press.",
    region: "body",
    weight: 1,
    tier: "phone",
    realPath: "Local",
    selections: { l1: { prop: "mode", choices: ["small", "large"] } },
    items: {
      key: "rows",
      parts: ["root", "qty", "apply"],
      adjust: {
        "qty.increment": { prop: "qty", delta: 1, max: 3 },
        "qty.decrement": { prop: "qty", delta: -1, min: 1 },
      },
    },
    actions: {
      parts: { l1: ["select"], root: ["press"], apply: ["press"] },
      items: { root: ["press"], qty: ["increment", "decrement"], apply: ["press"] },
      noGoto: { parts: ["apply"], items: ["apply"] },
    },
    read: (input: unknown) => (input as { rows: { qty: number }[] }).rows.map(({ qty }) => String(qty)),
  },
  props: z.strictObject({
    mode: z.string(),
    goto: z.string(),
    rows: z.array(z.strictObject({ qty: z.number(), goto: z.string() })),
  }),
  fallback: () => ({}),
  examples: [],
  probes: [],
} satisfies Definition;
const seed = {
  mode: "small",
  goto: "detail",
  rows: [
    { qty: 1, goto: "item" },
    { qty: 3, goto: "other" },
  ],
};
const screen = { id: "s", components: [{ id: "c1", c: fixture.meta.id, ...seed }] };
const defs = { [fixture.meta.id]: fixture };
const qty = (action: string, row = 1) => ({ address: `c1/r${row}/qty`, action });

it("applies each adjust-only step once, including at a bound, across both planners", () => {
  const runtime = createScreenController({ screen, defs });
  const steps = [qty("increment"), qty("increment"), qty("decrement", 2)];
  const planned = planAct(screen, defs, {}, steps);
  expect(planned).toMatchObject({
    ok: true,
    changed: ["c1/r1/qty increment = 2", "c1/r1/qty increment = 3", "c1/r2/qty decrement = 2"],
  });
  expect(runtime.act(steps, { dryRun: true })).toMatchObject({ ok: true });
  expect(runtime.snapshotScreen().components[0]).toMatchObject(seed);
  expect(runtime.act(steps)).toMatchObject({ ok: true });
  expect(runtime.snapshotScreen().components[0]?.rows).toEqual([
    { qty: 3, goto: "item" },
    { qty: 2, goto: "other" },
  ]);
  expect(runtime.actionsAt("c1/r1/qty")).toEqual(["decrement"]);
  expect(runtime.act(qty("increment"))).toMatchObject({ ok: false, code: "not_actionable" });
  expect(runtime.act({ address: "c1/r1/qty", action: "set", value: 2 })).toMatchObject({ ok: false });
  if (planned.ok) expect(runtime.read()).toBe(readScreen(screen, defs, planned.values));
});

it("does not infer a named l1 pick or navigate from an opted-out press", () => {
  const onLink = vi.fn();
  const onAction = vi.fn();
  const runtime = createScreenController({ screen, defs, onLink, onAction });
  expect(runtime.press("c1/l1")).toMatchObject({ ok: false, code: "invalid_value" });
  expect(runtime.act({ address: "c1/l1", action: "select", value: "large" })).toMatchObject({ ok: true });
  expect(runtime.snapshotScreen().components[0]?.mode).toBe("large");
  for (const address of ["c1/apply", "c1/r1/apply"]) {
    expect(runtime.press(address)).toMatchObject({ ok: true });
    expect(onAction).toHaveBeenLastCalledWith({ address: `s/${address}`, action: "press" });
  }
  expect(onLink).not.toHaveBeenCalled();
  expect(runtime.press("c1")).toMatchObject({ ok: true });
  expect(runtime.press("c1/r1")).toMatchObject({ ok: true });
  expect(onLink.mock.calls).toEqual([
    ["detail", "s/c1"],
    ["item", "s/c1/r1"],
  ]);
});

function withQuantity(qtyProp: z.ZodType, row: object, delta: number, pipe?: "item") {
  const item = z.strictObject({ qty: qtyProp, goto: z.string() });
  const rows = z.array(pipe === "item" ? item.transform((value) => value) : item);
  const def = {
    ...fixture,
    meta: {
      ...fixture.meta,
      items: { ...fixture.meta.items, adjust: { "qty.increment": { prop: "qty", delta } } },
    },
    props: fixture.props.extend({ rows }),
  } satisfies Definition;
  const current = { ...screen, components: [{ ...screen.components[0]!, rows: [{ goto: "item", ...row }] }] };
  const definitions = { [def.meta.id]: def };
  return { current, definitions, runtime: createScreenController({ screen: current, defs: definitions }) };
}

it.each([undefined, "item"] as const)("rejects out-of-schema adjustments (pipe: %s)", (pipe) => {
  const { current, definitions, runtime } = withQuantity(z.number().max(3).default(3), {}, 1, pipe);
  const step = qty("increment");
  expect(planAct(current, definitions, {}, [step])).toMatchObject({ ok: false, code: "invalid_value" });
  expect(runtime.act(step)).toMatchObject({ ok: false, code: "invalid_value" });
  expect(runtime.read()).toContain("3");
});

it("refuses to write to a row when an array transform can change its wire index", () => {
  const def = {
    ...fixture,
    props: fixture.props.extend({ rows: fixture.props.shape.rows.transform((rows) => rows.reverse()) }),
  };
  const definitions = { [def.meta.id]: def };
  const runtime = createScreenController({ screen, defs: definitions });
  const step = qty("increment", 2);
  expect(runtime.read()).toContain("[c1/r2 press→item]");
  expect(planAct(screen, definitions, {}, [step])).toMatchObject({ ok: false, code: "not_actionable" });
  expect(runtime.act(step)).toMatchObject({ ok: false, code: "not_actionable" });
  expect(runtime.snapshotScreen().components[0]?.rows).toEqual(seed.rows);
});

it("uses the parsed row quantity as the next step's seed after schema normalization", () => {
  const { current, definitions, runtime } = withQuantity(z.number().overwrite(Math.round), { qty: 1 }, 0.6);
  const steps = [qty("increment"), qty("increment")];
  const planned = planAct(current, definitions, {}, steps);
  expect(planned.ok).toBe(true);
  if (planned.ok) expect(readScreen(current, definitions, planned.values)).toContain("c1 AdjustFixture 3 ");
  expect(runtime.act(steps).ok).toBe(true);
  expect(runtime.read()).toContain("c1 AdjustFixture 3 ");
});

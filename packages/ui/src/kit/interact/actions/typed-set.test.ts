import { expect, it, vi } from "vitest";
import { z } from "zod";
import { isoDate, planAct, readScreen, type Definition } from "../../../catalog";
import { createScreenController } from "../index";

const fixture = {
  meta: {
    id: "TypedSetFixture",
    group: "input",
    purpose: "Edit several kinds of values.",
    pick: "A fixture for typed setters.",
    region: "body",
    weight: 1,
    tier: "phone",
    realPath: "Local control.",
    set: {
      date: { type: "date", prop: "on", min: "2024-02-29", max: "2024-03-15" },
      root: { type: "choice", prop: "mode", choices: ["all", "some", "none"] },
      amount: { type: "number", prop: "count", min: 0, max: 5, integer: true },
      legacy: { prop: "quantity", min: 0, max: 3 },
    },
    adjust: { "plus.increment": { prop: "quantity", delta: 0.5, max: 2 } },
    actions: {
      parts: { date: ["set", "type"], root: ["set"], amount: ["set"], legacy: ["set"], plus: ["increment"] },
    },
    read: (input) => [`Current ${(input as { summary: string }).summary}`],
  },
  props: z
    .strictObject({
      on: isoDate,
      mode: z.enum(["all", "some", "none"]),
      count: z.number(),
      quantity: z.number(),
    })
    .refine(({ mode }) => mode !== "none")
    .overwrite((props) => ({
      ...props,
      summary: `${props.on} ${props.mode} ${props.count} ${props.quantity}`,
    })),
  examples: [],
  fallback: () => ({}),
  probes: [],
} satisfies Definition;

const defs = { [fixture.meta.id]: fixture };
const seed = { on: "2024-03-01", mode: "all", count: 1, quantity: 1 };
const screen = { id: "s", components: [{ id: "c1", c: fixture.meta.id, ...seed }] };
const set = (part: string, value: unknown) => ({ address: `s/c1/${part}`, action: "set", value });

function setup() {
  const onAction = vi.fn();
  const runtime = createScreenController({ defs, screen, onAction, requireMounted: true });
  for (const part of ["date", "root", "amount", "legacy", "plus"]) runtime.registerPart(`s/c1/${part}`);
  return { runtime, onAction };
}

it("projects typed set values into snapshots, render props and both reads", () => {
  const { runtime, onAction } = setup();
  const steps = [
    set("date", "2024-02-29"),
    set("root", "some"),
    set("amount", 5),
    set("legacy", 1.75),
    { address: "s/c1/plus", action: "increment" },
    { address: "s/c1/date", action: "type", value: "uncommitted text" },
  ];
  const plan = planAct(screen, defs, {}, steps);
  expect(plan.ok).toBe(true);
  expect(runtime.act(steps, { dryRun: true }).ok).toBe(true);
  expect(runtime.snapshotScreen()).toEqual(screen);
  expect(onAction).not.toHaveBeenCalled();
  expect(runtime.act(steps).ok).toBe(true);
  const { id, c: _c, ...wire } = runtime.snapshotScreen().components[0]!;
  const expected = { on: "2024-02-29", mode: "some", count: 5, quantity: 2 };
  expect(wire).toEqual(expected);
  expect(runtime.liveControls(fixture.meta, fixture.props.parse(wire), id)).toMatchObject({
    ...expected,
    summary: "2024-02-29 some 5 2",
  });
  const reading = readScreen(screen, defs, plan.ok ? plan.values : {});
  expect(runtime.read()).toBe(reading);
  expect(reading).toContain("Current 2024-02-29 some 5 2");
  expect(reading).toContain('[c1/date set = "2024-02-29"]');
  expect(reading).toContain('[c1 set = "some"]');
  expect(runtime.act(set("date", "2024-03-15")).ok).toBe(true);
  expect(runtime.snapshotScreen().components[0]?.on).toBe("2024-03-15");
});

it.each([
  ["date", "2026-02-30"],
  ["date", "2024-02-28"],
  ["date", "2024-03-16"],
  ["root", "unknown"],
  ["root", "none"], // Allowed by metadata, but forbidden by the component schema.
  ["amount", "2"],
  ["amount", 1.5],
  ["amount", 6],
  ["legacy", 3], // The numeric setter still uses the intersection with the nudge bound.
])("rejects invalid %s edits and rolls back earlier steps (%j)", (part, value) => {
  const { runtime, onAction } = setup();
  const steps = [set("date", "2024-03-15"), set(part, value)];
  const before = runtime.store.snapshot();
  const failure = { ok: false, code: "invalid_value", at: 1 };
  expect(planAct(screen, defs, {}, steps)).toMatchObject(failure);
  expect(runtime.act(steps)).toMatchObject(failure);
  expect(runtime.store.snapshot()).toEqual(before);
  expect(runtime.snapshotScreen()).toEqual(screen);
  expect(onAction).not.toHaveBeenCalled();
});

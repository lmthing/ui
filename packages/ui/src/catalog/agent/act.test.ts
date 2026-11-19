import { expect, it } from "vitest";
import { z } from "zod";
import type { Definition } from "../probes";
import { planAct, type ActStep, type Values } from "./act";
import { liveProps } from "./live-props";

const fixture = {
  meta: {
    id: "ChoiceSetFixture",
    group: "input",
    purpose: "Configure a choice and a quantity.",
    pick: "A fixture for declared controls.",
    region: "body",
    weight: 1,
    tier: "phone",
    realPath: "Local preferences.",
    select: { prop: "mode", choices: { option: ["simple", "custom"] } },
    set: { quantity: { prop: "amount", min: 0, max: 4, integer: true }, root: { prop: "rate" } },
    actions: {
      parts: { option: ["select"], quantity: ["set", "type"], root: ["set"], date: ["set"] },
      when: { quantity: { mode: "custom" } },
    },
  },
  props: z.strictObject({ mode: z.enum(["simple", "custom"]), amount: z.number(), rate: z.number() }),
  fallback: () => ({}),
  examples: [],
  probes: [],
} satisfies Definition;
const seed = { mode: "simple", amount: 2, rate: 1 };
const screen = { id: "test", components: [{ id: "p1", c: fixture.meta.id, ...seed }] };
const plan = (steps: ActStep[], values: Values = {}) =>
  planAct(screen, { ChoiceSetFixture: fixture }, values, steps);
const option = (value?: unknown) => ({ address: "p1/option", action: "select", value });
const quantity = (value: unknown) => ({ address: "test/p1/quantity", action: "set", value });
const asProps = (values: Values) =>
  liveProps(
    fixture.meta,
    seed,
    "p1",
    Object.fromEntries(Object.entries(values).map(([key, value]) => [key.replace("test/", ""), value])),
  );

it("validates explicit selection at a single address and uses the projected prop for later steps", () => {
  expect(plan([quantity(0)])).toMatchObject({ ok: false, code: "not_actionable" });
  for (const value of [undefined, "SIMPLE", "other", 0, null])
    expect(plan([option(value)])).toMatchObject({ ok: false, code: "invalid_value", at: 0 });
  const result = plan([option("custom"), quantity(0), quantity(4), quantity(0), option("simple")]);
  expect(result).toMatchObject({ ok: true });
  if (!result.ok) return;
  expect(result.values).toMatchObject({ "test/p1/option": "simple", "test/p1/quantity": 0 });
  expect(asProps(result.values)).toEqual({ ...seed, amount: 0 });
  expect(seed.amount).toBe(2);
});

it("rejects values outside inclusive top-level numeric bounds, atomically", () => {
  for (const value of [-1, 5, 0.5, "2", NaN, Infinity, undefined]) {
    const initial = {};
    expect(plan([option("custom"), quantity(value)], initial)).toMatchObject({
      ok: false,
      code: "invalid_value",
      at: 1,
    });
    expect(initial).toEqual({});
  }
});

it("keeps numeric projection separate from other actions and supports the component root", () => {
  expect(plan([{ address: "p1", action: "set", value: "0.5" }])).toMatchObject({
    ok: false,
    code: "invalid_value",
  });
  const result = plan([
    option("custom"),
    quantity(4),
    { address: "p1/quantity", action: "type", value: "not an amount" },
    { address: "test/p1/root", action: "set", value: 0.5 },
    { address: "p1/date", action: "set", value: "2026-11-19" },
  ]);
  expect(result).toMatchObject({ ok: true });
  if (!result.ok) return;
  expect(asProps(result.values)).toEqual({ mode: "custom", amount: 4, rate: 0.5 });
  expect(result.values["test/p1/date"]).toBe("2026-11-19");
});

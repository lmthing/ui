import { expect, it, vi } from "vitest";
import { z } from "zod";
import { components, text, variantProps } from "@lmthing/ui/catalog";
import type { MigrationOptions } from "../migrations";
import type { Definition } from "../probes";
import { planAct, type ActStep, type Values } from "./act";
import { liveProps } from "./live-props";
import { readComponent, readScreen, type ScreenLike } from "./read";

vi.mock("../migrations", async (load) => {
  const migrations = await load<typeof import("../migrations")>();
  const options = { variantComponents: ["Card"] };
  return {
    ...migrations,
    migrateLine: (line: Record<string, unknown>, caller?: MigrationOptions) =>
      migrations.migrateLine(line, { ...options, ...caller }),
    migrateScreen: (screen: ScreenLike, caller?: MigrationOptions) =>
      migrations.migrateScreen(screen, { ...options, ...caller }),
  };
});

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
  expect(readScreen(screen, { ChoiceSetFixture: fixture }, result.values)).toContain("[p1/quantity set = 4]");
});

it("uses the last numeric item value for both adjustments in the pure planner and reader", () => {
  const def = {
    ...fixture,
    meta: {
      ...fixture.meta,
      items: {
        key: "rows",
        parts: ["value", "up", "down"],
        set: { value: { prop: "amount" } },
        adjust: {
          "up.increment": { prop: "amount", delta: 0.5 },
          "down.decrement": { prop: "amount", delta: -0.5, min: 5, max: 30 },
        },
      },
      actions: { items: { value: ["set"], up: ["increment"], down: ["decrement"] } },
      read: (input: unknown) =>
        (input as { rows: { amount: number }[] }).rows.map(({ amount }) => String(amount)),
    },
    props: z.strictObject({ rows: z.array(z.strictObject({ amount: z.number() })) }),
  } satisfies Definition;
  const current = {
    id: "test",
    components: [{ id: "p1", c: def.meta.id, rows: [{ amount: 21 }, { amount: 20 }] }],
  };
  const defs = { [def.meta.id]: def };
  expect(planAct(current, defs, {}, [{ address: "p1/r1/value", action: "set", value: 80 }])).toMatchObject({
    ok: false,
    code: "invalid_value",
  });
  const result = planAct(current, defs, {}, [
    { address: "p1/r1/value", action: "set", value: 24 },
    { address: "p1/r1/up", action: "increment" },
    { address: "p1/r1/down", action: "decrement" },
  ]);
  expect(result).toMatchObject({
    ok: true,
    changed: ["p1/r1/value set = 24", "p1/r1/up increment = 24.5", "p1/r1/down decrement = 24"],
  });
  if (result.ok) {
    const read = readScreen(current, defs, result.values);
    expect(read).toContain("24 — 20");
    expect(read).toContain("[p1/r1/value set = 24]");
  }
});

const card = {
  ...components.Card,
  meta: {
    ...components.Card.meta,
    variants: { surface: ["plain", "outlined"] },
    set: { amount: { prop: "amount", min: 0, max: 4 } },
    actions: { parts: { root: ["press"], amount: ["set"] }, when: { amount: { surface: "outlined" } } },
  },
  props: z
    .strictObject({
      ...variantProps({ surface: ["plain", "outlined"] }),
      title: text(40),
      goto: z.string(),
      amount: z.number().default(0),
    })
    .overwrite((props) => ({ ...props, amount: Math.round(props.amount) })),
} as const;
const oldCard = { style: "outlined", title: "One", goto: "details", density: "compact" };
const saved = { id: "home", components: [{ c: "c-a_r d", id: "c1", ...oldCard }] };
const press = { address: "home/c1", action: "press" };
const cardDefs = { Card: card, Timeline: components.Timeline };

it.each([oldCard, { title: "One", goto: "details" }])("migrates saved Card props: %j", (props) => {
  const current = { ...saved, components: [{ c: "c-a_r d", id: "c1", ...props }] };
  expect(readComponent(card, props, "c1").join("\n")).toContain('"One"');
  expect(readScreen(current, cardDefs)).toContain("[c1 press→details]");
  expect(planAct(current, cardDefs, {}, [press])).toMatchObject({
    ok: true,
    links: [{ address: "home/c1", goto: "details" }],
  });
  expect(current.components[0]).toEqual({ c: "c-a_r d", id: "c1", ...props });
});

it.each([null, {}])("leaves retired component lines out of variant migration: %j", (block) => {
  const current = {
    ...saved,
    components: [...saved.components, { c: "DayTimeline", id: "bad", blocks: [block] }],
  };
  expect(planAct(current, cardDefs, {}, []).ok).toBe(true);
  expect(planAct(current, cardDefs, {}, [press]).ok).toBe(true);
  expect(readScreen(current, cardDefs)).toContain("bad DayTimeline (unknown)");
});

it("validates and reads staged numeric edits on migrated and repaired props", () => {
  const step = { address: "home/c1/amount", action: "set", value: 2.6 };
  const result = planAct(saved, cardDefs, {}, [step]);
  if (!result.ok) throw new Error(`Expected the migrated control to be actionable: ${result.code}`);
  const part = "[c1/amount set = 3]";
  const values = { "c1/$adjust/amount": 2.6 };
  expect(readScreen(saved, cardDefs, result.values)).toContain(part);
  expect(readComponent(card, oldCard, "c1", "filled", values).join("\n")).toContain(part);
  const rejected = planAct(saved, cardDefs, {}, [{ ...step, value: 5 }]);
  expect(rejected).toMatchObject({ ok: false, code: "invalid_value" });
});

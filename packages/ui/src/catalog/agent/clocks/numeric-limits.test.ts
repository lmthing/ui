import { expect, it } from "vitest";
import { z } from "zod";
import { planAct, readScreen, writerFormatFor, type Definition, type ScreenLike } from "@lmthing/ui/catalog";

const def = {
  meta: {
    id: "QuantityFixture",
    group: "input",
    purpose: "Set a quantity.",
    pick: "Set a quantity.",
    region: "body",
    weight: 1,
    tier: "phone",
    realPath: "Local selection.",
    set: { quantity: { prop: "amount", runtime: true, maxProp: "cap", initial: 0, min: 0, integer: true } },
    adjust: { "up.increment": { prop: "amount", delta: 1 } },
    actions: { parts: { quantity: ["set"], up: ["increment"] } },
    read: (props: unknown) => [`amount ${(props as { amount: number }).amount}`],
  },
  props: z.strictObject({ cap: z.number().int().min(0).max(4).optional() }),
  fallback: () => ({}),
  examples: [],
  probes: [],
} satisfies Definition;
const defs = { QuantityFixture: def };
const screen = (cap?: number): ScreenLike => ({
  id: "home",
  components: [{ id: "entry", c: "QuantityFixture", cap }],
});
const set = (value: unknown) => ({ address: "entry/quantity", action: "set", value });
const increment = { address: "entry/up", action: "increment" };

it("validates the inclusive runtime maximum without adding the destination to the Writer schema", () => {
  expect(Object.keys(writerFormatFor(def).json_schema.schema.properties ?? {})).toEqual(["c", "cap"]);
  expect(def.props.safeParse({ cap: 3, amount: 1 }).success).toBe(false);
  const start = {};
  for (const value of [4, -1, 1.5, "3", Infinity]) {
    expect(planAct(screen(3), defs, start, [set(2), set(value)])).toMatchObject({
      ok: false,
      at: 1,
      code: "invalid_value",
    });
  }
  expect(start).toEqual({});
  expect(planAct(screen(0), defs, {}, [set(0)]).ok).toBe(true);
  expect(planAct(screen(4), defs, {}, [set(4)]).ok).toBe(true);
  expect(planAct(screen(), defs, {}, [set(0)])).toMatchObject({ ok: false, code: "not_actionable" });
});

it("shares the stored value with the reader and nudges without injecting it into the next parse", () => {
  const current = screen(3);
  expect(readScreen(current, defs)).toContain("amount 0 [entry/quantity set = 0]");
  const result = planAct(current, defs, {}, [set(2), increment]);
  expect(result).toMatchObject({ ok: true, values: { "home/entry/$adjust/amount": 3 } });
  if (!result.ok) return;
  const reading = readScreen(current, defs, result.values);
  expect(reading).toContain("amount 3 [entry/quantity set = 3]");
  expect(reading).not.toContain("[entry/up increment]");
  expect(planAct(current, defs, result.values, [increment])).toMatchObject({
    ok: false,
    code: "not_actionable",
  });
  expect(readScreen(screen(1), defs, result.values)).toContain("amount 0 [entry/quantity set = 0]");
});

it("uses the same validated maximum even if a live derivation writes that prop", () => {
  const withDerived: Definition = {
    ...def,
    meta: {
      ...def.meta,
      set: { quantity: { ...def.meta.set.quantity, initial: 1, min: 1 } },
      live: { derive: () => ({ cap: 0 }) },
    },
  };
  const defs = { QuantityFixture: withDerived };
  expect(readScreen(screen(3), defs)).toContain("[entry/quantity set = 1]");
  const result = planAct(screen(3), defs, {}, [set(2), increment]);
  expect(result).toMatchObject({ ok: true, values: { "home/entry/$adjust/amount": 3 } });
  expect(planAct(screen(3), defs, {}, [set(4)])).toMatchObject({ ok: false, code: "invalid_value" });
});

it("does not offer or admit runtime-only numeric actions in loading state", () => {
  const loading = screen(3);
  loading.components[0]!.state = "loading";
  expect(readScreen(loading, defs)).toBe("screen home\nentry QuantityFixture (loading)");
  expect(planAct(loading, defs, {}, [set(2)])).toMatchObject({ ok: false, code: "not_actionable" });
});

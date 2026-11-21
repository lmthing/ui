import { expect, it } from "vitest";
import { z } from "zod";
import { planAct, readScreen } from "../../index";
import type { Definition } from "../../../probes";

const def: Definition = {
  props: z
    .strictObject({
      base: z.number(),
      size: z.number(),
      rows: z.array(z.strictObject({ amount: z.number(), cap: z.number() })),
    })
    .refine(({ rows, size }) => rows.every(({ amount }) => amount <= size)),
  meta: {
    id: "Quantities",
    group: "input",
    region: "body",
    weight: 1,
    tier: "phone",
    purpose: "",
    pick: "",
    realPath: "",
    deviceData: ["stock"],
    actions: { parts: { size: ["set"], base: ["set"] }, items: { amount: ["set"], more: ["increment"] } },
    set: {
      base: { prop: "base" },
      size: {
        prop: "size",
        bounds: (_, { base }, data) =>
          typeof data.stock?.[0] === "number"
            ? { min: Number(base), max: data.stock[0], step: 0.1 }
            : undefined,
      },
    },
    items: {
      key: "rows",
      parts: ["amount", "more"],
      set: {
        amount: {
          prop: "amount",
          bounds: ({ cap }, { size }) => ({ min: 0, max: Math.min(Number(cap), Number(size)), step: 0.1 }),
        },
      },
      adjust: { "more.increment": { prop: "amount", delta: 0.1 } },
    },
  },
  fallback: () => ({}),
  examples: [],
  probes: [],
};
const defs = { Quantities: def };
const screen = {
  id: "s",
  components: [{ id: "q", c: "Quantities", base: 0.2, size: 0.3, rows: [{ amount: 0.3, cap: 0.5 }] }],
};
const data = { stock: [0.5] };
const set = (part: string, value: number) => ({ address: `q/${part}`, action: "set", value });
const more = { address: "q/r1/more", action: "increment" };

it("uses current staged props and record limits in reads, direct sets, and item nudges", () => {
  const before = readScreen(screen, defs, {}, undefined, data);
  expect(before).toContain("[q/size set = 0.3; min 0.2, max 0.5, step 0.1]");
  expect(before).not.toContain("[q/r1/more increment]");
  expect(readScreen(screen, defs)).not.toContain("[q/size set");
  for (const amount of [0.35, 0.6]) {
    expect(planAct(screen, defs, {}, [set("size", amount)], null, "planner", data)).toMatchObject({
      ok: false,
      code: "invalid_value",
    });
  }
  const changed = planAct(screen, defs, {}, [set("size", 0.4), more], null, "planner", data);
  expect(changed).toMatchObject({ ok: true, values: { "s/q/$wire/r1/$adjust/amount": 0.4 } });
  const rejected = planAct(screen, defs, {}, [set("base", 0.4), set("size", 0.3)], null, "planner", data);
  expect(rejected).toMatchObject({ ok: false, at: 1, code: "invalid_value" });
  expect(planAct(screen, defs, {}, [set("r1/amount", 0.32)], null, "planner", data).ok).toBe(false);
  expect(planAct(screen, defs, {}, [set("size", 0.2)], null, "planner", data).ok).toBe(false);
});

it("projects a detached adjustment without a setter before deriving the next step's bounds", () => {
  const definition: Definition = {
    ...def,
    props: z.strictObject({ cap: z.int(), value: z.int() }),
    meta: {
      ...def.meta,
      actions: { parts: { more: ["increment"], value: ["set"] } },
      adjust: { "more.increment": { prop: "cap", delta: 1, bounds: () => ({ min: 1, max: 3 }) } },
      set: { value: { prop: "value", bounds: (_, { cap }) => ({ min: 1, max: Number(cap) }) } },
      read: (input) => [`cap ${(input as { cap: number }).cap}`],
    },
  };
  const input = { id: "s", components: [{ id: "q", c: "Quantities", cap: 1, value: 1 }] };
  const definitions = { Quantities: definition };
  const more = { address: "q/more", action: "increment" };
  expect(planAct(input, definitions, {}, [set("value", 2)]).ok).toBe(false);
  const result = planAct(input, definitions, {}, [more, set("value", 2)]);
  expect(result).toMatchObject({ ok: true, values: { "s/q/$adjust/cap": 2, "s/q/$adjust/value": 2 } });
  if (result.ok) expect(readScreen(input, definitions, result.values)).toContain("cap 2");
});

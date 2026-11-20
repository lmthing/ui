import { expect, it } from "vitest";
import { z } from "zod";
import {
  affordancesOf,
  parseControlProps,
  partTierAt,
  planAct,
  type Definition,
  type Meta,
} from "../../../../catalog";

const meta = {
  id: "LinkedFixture",
  group: "action",
  purpose: "Open a detail or apply a local change.",
  pick: "A link with a separate local control.",
  region: "body",
  weight: 1,
  tier: "phone",
  realPath: "Local",
  parts: ["root", "apply", "inspect"],
  items: { key: "rows", parts: ["root", "apply"] },
  actions: {
    parts: { root: ["press"], apply: ["press", "select"], inspect: ["press"] },
    items: { root: ["press"], apply: ["press"] },
  },
} satisfies Meta;

it("opts out only configured presses and only of the surrounding holder's link", () => {
  const props = {
    goto: "detail",
    inspect: { goto: "other" },
    rows: [
      { id: "r1", goto: "item" },
      { id: "r2", goto: "item", apply: { goto: "explicit" } },
    ],
  };
  const optedIn: Meta = {
    ...meta,
    actions: { ...meta.actions, noGoto: { parts: ["apply", "inspect"], items: ["apply"] } },
  };
  const offers = (def: Meta) =>
    Object.fromEntries(
      affordancesOf(def, props, "c1").map(({ address, action, detail }) => [`${address} ${action}`, detail]),
    );
  expect(offers(optedIn)).toEqual({
    "c1 press": "→detail",
    "c1/apply press": "",
    "c1/apply select": "→detail",
    "c1/inspect press": "→other",
    "c1/r1 press": "→item",
    "c1/r1/apply press": "",
    "c1/r2 press": "→item",
    "c1/r2/apply press": "→explicit",
  });
  expect(offers(meta)).toMatchObject({ "c1/apply press": "→detail", "c1/r1/apply press": "→item" });
});

it("resolves the buyer's part without reclassifying the seller's component", () => {
  const conditional = {
    ...meta,
    partTiers: { apply: "ok", inspect: "service" },
    partTiersBy: { root: { prop: "seller", tiers: { false: "people" } } },
  } satisfies Meta;
  expect(partTierAt(conditional, { seller: false }, "root")).toBe("people");
  expect(partTierAt(conditional, { seller: true }, "root")).toBe("phone");
  expect(partTierAt(conditional, { seller: false }, "apply")).toBe("ok");
  expect(partTierAt(conditional, { seller: "constructor" }, "root")).toBe("phone");
  expect(conditional.tier).toBe("phone");
});

it("applies all named picks and adjust-only wire edits before deriving other props", () => {
  const seed = { mode: "first", method: "old", rows: [{ qty: 4 }] };
  const fixture = {
    meta: {
      id: "ProjectionFixture",
      group: "input",
      purpose: "Choose preferences and update a quantity.",
      pick: "Exercise schema-derived controls.",
      region: "body",
      weight: 1,
      tier: "phone",
      realPath: "Local",
      selections: {
        mode: { prop: "mode", choices: ["first", "second"] },
        method: { prop: "method", choices: { prop: "available" } },
      },
      items: { key: "rows", parts: ["qty"], adjust: { "qty.increment": { prop: "qty", delta: 1 } } },
    },
    props: z
      .strictObject({
        mode: z.string(),
        method: z.string(),
        rows: z.array(z.strictObject({ qty: z.number() })),
      })
      .overwrite((input) => ({ ...input, available: [`${input.mode}:${input.rows[0]!.qty}`] })),
    fallback: () => seed,
    examples: [seed],
    probes: [],
  } satisfies Definition;
  const values: Record<string, unknown> = { $mode: "second", $method: "new", "r1/$adjust/qty": 5 };
  expect(parseControlProps(fixture, seed, (part) => values[part])).toEqual({
    mode: "second",
    method: "new",
    rows: [{ id: "r1", qty: 5 }],
    available: ["second:5"],
  });
  expect(seed).toEqual({ mode: "first", method: "old", rows: [{ qty: 4 }] });
});

it("stages adjust-only root increments on exactly the addressed item", () => {
  const fixture = {
    meta: {
      id: "AdjustFixture",
      group: "input",
      purpose: "Change a quantity.",
      pick: "Adjust an item.",
      region: "body",
      weight: 1,
      tier: "phone",
      realPath: "Local",
      items: {
        key: "rows",
        prefix: "i",
        parts: ["root"],
        adjust: { "root.increment": { prop: "count", delta: 2, max: 5 } },
      },
      actions: { items: { root: ["increment"] } },
    },
    props: z.strictObject({ rows: z.array(z.strictObject({ count: z.number() })) }),
    fallback: () => ({}),
    examples: [],
    probes: [],
  } satisfies Definition;
  const screen = {
    id: "s",
    components: [{ id: "c", c: fixture.meta.id, rows: [{ count: 1 }, { count: 4 }] }],
  };
  const defs = { [fixture.meta.id]: fixture };
  const step = { address: "c/i2", action: "increment" };
  const result = planAct(screen, defs, {}, [step]);
  expect(result).toMatchObject({ ok: true, values: { "s/c/i2": 5, "s/c/i2/$adjust/count": 5 } });
  if (result.ok) expect(planAct(screen, defs, result.values, [step])).toMatchObject({ ok: false });
});

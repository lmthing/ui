import { describe, expect, expectTypeOf, it } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  packReady,
  placeholderTitle,
  type CastLike,
  type Props,
  type StateName,
  type ThemeChoice,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, hasStepTarget, renderInstance } from "../../../../../test/render";

const def = components.Things;
const { examples, fallback, meta, props, probes } = def;
const theme = { preset: "calm", mode: "light", accent: "moss" } satisfies ThemeChoice;
const row = { name: "Kit", qty: 2, min: 2, goto: "kit" };
const render = (input: unknown, state: StateName = "filled") =>
  renderInstance("Things", input, state, theme, { component: "t1" });
const root = "home/t1";
const control = (input: object) =>
  createScreenController({
    defs: { Things: def },
    screen: {
      id: "home",
      components: [{ id: "t1", c: "Things", ...input }],
    },
  });
describe("Things schema", () => {
  it.each(examples)("accepts a domain example", (input) => expect(props.safeParse(input).success).toBe(true));

  it("uses the grid by default and accepts the exact text, record and count bounds", () => {
    const max = { ...row, name: "a".repeat(28), where: "b".repeat(24), qty: Number.MAX_SAFE_INTEGER };
    expect(props.parse({ items: Array.from({ length: 12 }, () => max) })).toMatchObject({
      arrange: "grid",
      filter: "all",
      items: Array.from({ length: 12 }, () => max),
    });
    expectTypeOf<Props<typeof props, typeof meta>["items"][number]["id"]>().toEqualTypeOf<string>();
  });

  it.each([
    {},
    { items: [] },
    { items: Array.from({ length: 13 }, () => row) },
    { items: [{ ...row, name: "a".repeat(29) }] },
    { items: [{ ...row, where: "a".repeat(25) }] },
    { items: [{ ...row, qty: -1 }] },
    { items: [{ ...row, qty: 0.5 }] },
    { items: [{ ...row, qty: Number.MAX_SAFE_INTEGER + 1 }] },
    { items: [{ ...row, min: -1 }] },
    { items: [{ ...row, min: 1.5 }] },
    { items: [{ ...row, value: -1 }] },
    { items: [{ ...row, photo: "https://example.com/image.jpg" }] },
    { items: [{ ...row, goto: "Bad ID" }] },
    { items: [{ ...row, visible: false }] },
    { items: [{ ...row, id: "r1" }] },
    { items: [row], filter: "none" },
    { items: [row], arrange: "strip" },
    { items: [row], surface: "tinted" },
    { items: [row], color: "#fff" },
  ])("rejects invalid wire input: %j", (input) => expect(props.safeParse(input).success).toBe(false));
});

describe("Things fallback and probes", () => {
  it("derives bounded fallback names and locations and invents no stock threshold", () => {
    const things = [{ type: "tool", fields: ["name", "location"] }];
    const item = { type: "tool", id: "tools", sample: true, name: "Drill", location: "Top shelf" };
    const casts: CastLike[] = [
      { things, items: [item] },
      { things, items: [{ ...item, name: 2 }] },
      { things, items: [{ ...item, name: "x".repeat(60), location: "x".repeat(60) }] },
      { things: [], items: [] },
    ];
    for (const cast of casts) expect(props.safeParse(fallback({ cast, lang: "en" })).success).toBe(true);
    expect(fallback({ cast: casts[0]! }).items[0]).toEqual({
      name: "Drill",
      where: "Top shelf",
      qty: 0,
      goto: "details",
    });
    expect(fallback({ cast: casts[3]!, lang: "en" }).items[0]).toEqual({
      name: placeholderTitle(0, "en"),
      qty: 0,
      goto: "details",
    });
  });

  it("keeps the dense, on-device contract and the pack-independent probes", () => {
    expect(meta).toMatchObject({ tier: "phone", dense: true, weight: 3 });
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "Things" }),
        expect.objectContaining({ kind: "choose", expect: "List" }),
        expect.objectContaining({ kind: "write", expect: "Things" }),
        expect.objectContaining({ kind: "write", variant: { axis: "arrange", value: "rows" } }),
        expect.objectContaining({ kind: "read", expect: { address: "t1/r1/qty", action: "increment" } }),
      ]),
    );
    expect(createRegistry({ packs: ["inventory"] }).ids.includes("Things")).toBe(packReady("inventory"));
  });
});

describe("Things states and addressed parts", () => {
  it.each(["grid", "rows"] as const)("draws the same record parts in %s", (arrange) => {
    const input = { arrange, items: [{ ...row, photo: "lib:tools", where: "Top shelf", value: 0 }] };
    const parts = addressedElements(render(input));
    expect([...parts.keys()].sort()).toEqual(
      [
        `${root}/root`,
        ...["tile", "root", "name", "photo", "where", "value", "low", "qty"].map(
          (part) => `${root}/r1/${part}`,
        ),
      ].sort(),
    );
    expect(parts.get(`${root}/r1/root`)?.attributes).toContain('role="link"');
    expect(parts.get(`${root}/r1/low`)?.text).toContain("Low stock");
    expect(parts.get(`${root}/r1/value`)?.text).toContain("$0");
    expect(hasStepTarget(parts.get(`${root}/r1/qty`)!, "increment")).toBe(true);
    expect(hasStepTarget(parts.get(`${root}/r1/qty`)!, "decrement")).toBe(true);
  });

  it("keeps stock-filtered addresses stable and omits a healthy item's optional details", () => {
    const input = { items: [{ name: "Spare", goto: "spare", qty: 0 }, row] };
    const parts = addressedElements(render(input));
    for (const part of ["where", "value", "low"]) expect(parts.has(`${root}/r1/${part}`)).toBe(false);
    expect(parts.get(`${root}/r1/qty`)?.children[0]?.attributes).toContain('aria-disabled="true"');
    const filtered = addressedElements(render({ ...input, filter: "low" }));
    expect(filtered.has(`${root}/r1/root`)).toBe(false);
    expect(filtered.has(`${root}/r2/root`)).toBe(true);
  });

  it("draws inert skeletons and distinct collection and low-filter empty states", () => {
    const input = { items: [row] };
    const loading = render(input, "loading");
    expect(loading).toContain('aria-busy="true"');
    expect([...addressedElements(loading).keys()]).toEqual([`${root}/root`, `${root}/r1/tile`]);
    expect(loading).not.toContain("Increase quantity");
    expect(addressedElements(render(input, "empty")).get(`${root}/empty`)?.text).toEqual([
      "Nothing here yet",
    ]);
    const stocked = { items: [{ ...row, qty: 3 }], filter: "low" };
    expect([...addressedElements(render(stocked)).keys()]).toEqual([`${root}/root`, `${root}/empty`]);
    expect(render(stocked)).toContain("Nothing needs restocking");
    expect(addressedElements(render(stocked, "empty")).get(`${root}/empty`)?.text).toEqual([
      "Nothing here yet",
    ]);
    expect(render(stocked, "loading")).toContain('aria-busy="true"');
    for (const state of ["empty", "loading"] as const)
      expect(affordancesOf(meta, props.parse(input), "t1", {}, state)).toEqual([]);
  });
});

describe("Things quantity display", () => {
  it("keeps the exact count and both control slots in the grid's wide-count layout", () => {
    const qty = Number.MAX_SAFE_INTEGER;
    const html = render({ items: [{ ...row, qty }, row] });
    const parts = addressedElements(html);
    const stepper = parts.get(`${root}/r1/qty`)!;
    expect(html).toContain(`>${qty}<`);
    expect(parts.get(`${root}/r1/photo`)).toBeDefined();
    expect(stepper.children.at(-1)?.attributes).toContain('aria-disabled="true"');
    expect(hasStepTarget(stepper, "decrement")).toBe(true);
    expect(parts.get(`${root}/r2/qty`)).toBeDefined();
  });
});

describe("Things read and act", () => {
  it("updates the reading, stock condition and allowed actions as soon as a count changes", () => {
    const controller = control({ filter: "low", items: [{ ...row, qty: 5 }, row] });
    expect(controller.read()).toContain("Quantity: 2 · Minimum: 2 · Low stock");
    expect(controller.actionsAt("t1/r1")).toEqual([]);
    expect(controller.actionsAt("t1/r2")).toEqual(["press"]);
    expect(controller.actionsAt("t1/r2/qty")).toEqual(["increment", "decrement"]);
    expect(controller.act({ address: "t1/r2/qty", action: "increment" }).ok).toBe(true);
    expect(controller.read()).toContain("Nothing needs restocking");
    expect(controller.read()).not.toContain("t1/r2");
    expect(controller.act({ address: "t1/r2/qty", action: "decrement" }).ok).toBe(false);
  });

  it("allows a reversible decrement to zero and never decrements below zero or increments past safe integers", () => {
    const controller = control({
      items: [
        { ...row, qty: 1, min: 0 },
        { ...row, qty: Number.MAX_SAFE_INTEGER },
      ],
    });
    expect(controller.act({ address: "t1/r1/qty", action: "decrement" }).ok).toBe(true);
    expect(controller.read()).toContain("Quantity: 0 · Minimum: 0 · Low stock");
    expect(controller.act({ address: "t1/r1/qty", action: "decrement" }).ok).toBe(false);
    expect(controller.act({ address: "t1/r2/qty", action: "increment" }).ok).toBe(false);
    expect(controller.act({ address: "t1/r1/qty", action: "increment" }).ok).toBe(true);
    expect(controller.read()).toContain("Quantity: 1 · Minimum: 0");
    expect(controller.read()).not.toContain("Low stock");
  });
});

import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  affordancesOf,
  components,
  emptyLine,
  readComponent,
  stampItemIds,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { elementAt, renderInstance } from "../../../../test/render";
const { props, meta, examples, fallback, probes } = components.FoodLog;
const food = { name: "Lasagne", kcal: 520, amount: "1 slice" };
const input = {
  meals: [
    { meal: "dinner", items: [food] },
    { meal: "snack", items: [] },
  ],
  target: 2000,
  goto: "food_add",
};
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const mealNames = ["breakfast", "lunch", "dinner", "snack"] as const;
describe("FoodLog schema and boundaries", () => {
  it.each(examples)("accepts a domain example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("trims text and derives flattened rows without changing meal order", () => {
    const parsed = props.parse({
      ...input,
      meals: [{ meal: "dinner", items: [{ ...food, name: " Lasagne ", amount: " 1 slice " }] }],
    });
    expect(parsed.rows).toEqual([
      { entry: "meal", meal: "dinner", goto: "food_add" },
      { entry: "food", ...food },
    ]);
  });
  it.each([
    {},
    { ...input, meals: [] },
    { ...input, meals: Array.from({ length: 5 }, () => input.meals[0]) },
    { ...input, meals: [input.meals[0], input.meals[0]] },
    ...[
      { name: "" },
      { name: " " },
      { name: "a".repeat(29) },
      { amount: "" },
      { amount: "a".repeat(13) },
      { kcal: -1 },
      { kcal: 10001 },
      { kcal: Infinity },
      { kcal: NaN },
      { kcal: "520" },
      { id: "r1" },
      { color: "red" },
      { unknown: true },
    ].map((change) => ({ ...input, meals: [{ meal: "dinner", items: [{ ...food, ...change }] }] })),
    { ...input, meals: [{ meal: "supper", items: [] }] },
    { ...input, meals: [{ meal: "dinner", items: Array.from({ length: 7 }, () => food) }] },
    { ...input, meals: [{ meal: "dinner", items: [], total: 0 }] },
    ...[0, -1, 20001, Infinity, NaN, "2000"].map((target) => ({ ...input, target })),
    ...["Bad ID", "a".repeat(65)].map((goto) => ({ ...input, goto })),
    { ...input, goto: undefined },
    { ...input, rows: [] },
    { ...input, total: 520 },
    { ...input, color: "#ffffff" },
    { ...input, pixels: 4 },
    { ...input, style: "grid" },
  ])("rejects invalid or model-owned derived input", (value) =>
    expect(props.safeParse(value).success).toBe(false),
  );
});
describe("FoodLog exact bounds", () => {
  it("accepts all exact limits, zeros, fractions and over-target totals", () => {
    const maxFood = { name: "a".repeat(28), amount: "b".repeat(12), kcal: 10000 };
    const max = {
      meals: mealNames.map((meal) => ({ meal, items: Array.from({ length: 6 }, () => maxFood) })),
      target: 20000,
      goto: "a".repeat(64),
    };
    expect(props.parse(max).rows).toHaveLength(28);
    expect(props.safeParse({ ...max, target: 1 }).success).toBe(true);
    for (const items of [[], [{ name: "Food", kcal: 0 }], [{ name: "Food", kcal: 0.5 }]])
      expect(props.safeParse({ meals: [{ meal: "snack", items }], goto: "back" }).success).toBe(true);
  });
  it("keeps stamped ids out of writer props", () => {
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["rows"][number]["id"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
    expect(props.safeParse({ ...input, meals: [{ meal: "dinner", id: "r1", items: [] }] }).success).toBe(
      false,
    );
  });
});
describe("FoodLog fallback and contract", () => {
  it("uses neutral placeholders or bounded cast titles, including malformed and mixed content", () => {
    const casts: CastLike[] = [
      { things: [], items: [] },
      {
        things: [{ type: "record", fields: ["label"] }],
        items: [{ id: "one", type: "record", sample: true, label: "Morning" }],
      },
      {
        things: [],
        items: [
          { id: "one", type: "record", sample: true, title: "Morning" },
          { id: "two", type: "other", sample: true, title: "Evening" },
        ],
      },
      { things: [], items: [{ id: "one", type: "record", sample: true, label: 4 }] },
      {
        things: [{ type: "record", fields: ["label"] }],
        items: Array.from({ length: 8 }, (_, index) => ({
          id: `r_${index}`,
          type: "record",
          sample: false,
          label: "a".repeat(80),
        })),
      },
    ];
    for (const cast of casts) expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: casts[0]! }).meals[0]!.items.map((row) => row.name)).toEqual([
      "Item one",
      "Item two",
      "Item three",
    ]);
    expect(fallback({ cast: casts[1]! }).meals[0]!.items[0]!.name).toBe("Morning");
    expect(fallback({ cast: casts[4]! }).meals[0]!.items).toHaveLength(3);
  });
  it("preserves dense limits, service-marked adds, core-first and all read probes", () => {
    expect(meta.status).toBe("ready");
    expect(meta.dense).toBe(true);
    expect(meta.tier).toBe("phone");
    expect(meta.partTiers).toEqual({ add: "service" });
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("List");
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "List")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "FoodLog" });
    const actions = affordancesOf(meta, stampItemIds(meta, props.parse(examples[0])), "f1");
    for (const probe of probes.filter((probe) => probe.kind === "read"))
      expect(actions).toContainEqual(expect.objectContaining(probe.expect));
  });
});
describe("FoodLog states, parts, reading and actions", () => {
  it.each(examples)("draws all and only the relevant item parts once", (example) => {
    const html = renderInstance("FoodLog", example, "filled", theme);
    const parsed = props.parse(example);
    expect(html.match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
    parsed.rows.forEach((row, index) => {
      const parts =
        row.entry === "meal"
          ? ["root", "meal", "add"]
          : ["root", "name", "kcal", ...(row.amount && parsed.detail === "full" ? ["amount"] : [])];
      for (const part of meta.items.parts) {
        const found = html.match(new RegExp(`data-testid="home/c1/r${index + 1}/${part}"`, "g")) ?? [];
        expect(found).toHaveLength(parts.includes(part) ? 1 : 0);
      }
    });
    expect(html.includes('data-testid="home/c1/target"')).toBe(parsed.target !== undefined);
    expect(readComponent(components.FoodLog, example, "f1").join("\n")).not.toContain("undefined");
  });
  it("draws the shared empty state without stale totals, food rows or actions", () => {
    const html = renderInstance("FoodLog", input, "empty", theme, "record");
    expect(html).toContain(emptyLine("record"));
    expect(html).not.toContain('data-testid="home/c1/total"');
    expect(html).not.toContain('role="button"');
    expect(meta.read(input, "empty")).toEqual([]);
    expect(readComponent(components.FoodLog, input, "f1", "empty")).toEqual(["f1 FoodLog (empty)"]);
  });
  it("keeps add controls for all empty groups and omits a missing target", () => {
    const value = { meals: mealNames.map((meal) => ({ meal, items: [] })), goto: "food_add" };
    const html = renderInstance("FoodLog", value, "filled", theme);
    expect(html).toContain("0 kcal");
    expect(html).not.toContain("Daily target");
    expect(affordancesOf(meta, stampItemIds(meta, props.parse(value)), "f1")).toHaveLength(4);
  });
  it("offers and dispatches adds only on meals and presses only on foods, including repeated actions", () => {
    const onLink = vi.fn(),
      onAction = vi.fn();
    const screen = { id: "home", components: [{ id: "f1", c: "FoodLog", ...input }] };
    const runtime = createScreenController({ screen, defs: components, onLink, onAction });
    expect(runtime.act({ address: "f1/r1", action: "press" })).toMatchObject({ ok: false });
    expect(runtime.act({ address: "f1/r2/add", action: "press" })).toMatchObject({ ok: false });
    for (let repeat = 0; repeat < 2; repeat++) {
      expect(runtime.act({ address: "f1/r1/add", action: "press" })).toMatchObject({ ok: true });
      expect(runtime.act({ address: "f1/r2", action: "press" })).toMatchObject({ ok: true });
    }
    expect(onLink).toHaveBeenCalledTimes(2);
    expect(onLink).toHaveBeenLastCalledWith("food_add", "home/f1/r1/add");
    expect(onAction).toHaveBeenCalledTimes(4);
    const html = renderInstance("FoodLog", input, "filled", theme, { component: "f1" });
    expect(elementAt(html, "home/f1/r1/add").attributes).toContain('role="button"');
    expect(elementAt(html, "home/f1/r2/root").attributes).toContain('role="button"');
    expect(runtime.read()).toContain("[f1/r1/add press→food_add !needs-service]");
    expect(runtime.read()).toContain("[f1/r2 press]");
  });
});

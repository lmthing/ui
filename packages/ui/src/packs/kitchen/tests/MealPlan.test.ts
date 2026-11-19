import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  readComponent,
  stampItemIds,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { createAgentAccess, createScreenController } from "@lmthing/ui/kit";
import { elementAt, renderInstance, styleAt } from "../../../../test/render";
const { props, meta, examples, fallback, probes } = components.MealPlan;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const cell = { day: 3, meal: "dinner", title: "Nonna's lasagne", photo: "lib:food", goto: "recipe_overview" };
const input = { week: "2026-11-16", meals: ["lunch", "dinner"], cells: [cell] };
type Row = Partial<typeof cell> & { id: string; day: number; meal: string; filled: boolean };
const parsedRows = (value: unknown) => (value as { rows: Row[] }).rows;
describe("MealPlan schema and boundaries", () => {
  it.each(examples)("accepts each domain example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("trims recipes and derives day-first rows including empty add cells", () => {
    const value = props.parse({ ...input, cells: [{ ...cell, title: "  Nonna's lasagne  " }] });
    expect(parsedRows(value)).toHaveLength(14);
    expect(parsedRows(value)[0]).toEqual({ day: 0, meal: "lunch", filled: false });
    expect(parsedRows(value)[7]).toMatchObject({ ...cell, filled: true });
    expect(parsedRows(value)[13]).toEqual({ day: 6, meal: "dinner", filled: false });
  });
  it.each([
    {},
    { ...input, week: "2026-11-17" },
    { ...input, week: "2026-02-30" },
    { ...input, meals: [] },
    { ...input, meals: ["dinner", "dinner"] },
    { ...input, meals: ["brunch"] },
    { ...input, meals: ["breakfast", "lunch", "dinner", "snack", "breakfast"] },
    { ...input, cells: Array(29).fill(cell) },
    { ...input, cells: [cell, cell] },
    ...[
      { day: -1 },
      { day: 7 },
      { day: 1.5 },
      { meal: "snack" },
      { title: "" },
      { title: " " },
      { title: "a".repeat(25) },
      { photo: "https://example.org/photo" },
      { goto: "Bad ID" },
      { goto: "a".repeat(65) },
      { id: "r1" },
      { filled: false },
      { color: "red" },
    ].map((extra) => ({ ...input, cells: [{ ...cell, ...extra }] })),
    { ...input, rows: [] },
    { ...input, today: 3 },
    { ...input, color: "red" },
    { ...input, size: 44 },
  ])("rejects invalid or computed/presentation-owned input", (value) =>
    expect(props.safeParse(value).success).toBe(false),
  );
});
describe("MealPlan maximum boundaries", () => {
  it("accepts 28 cells and all exact text/reference limits", () => {
    const meals = ["breakfast", "lunch", "dinner", "snack"];
    const cells = Array.from({ length: 7 }, (_, day) =>
      meals.map((meal) => ({
        day,
        meal,
        title: "a".repeat(24),
        goto: "a".repeat(64),
        photo: "local:1",
      })),
    ).flat();
    expect(parsedRows(props.parse({ ...input, meals, cells }))).toHaveLength(28);
    expect(parsedRows(props.parse({ ...input, cells: [] })).every((row) => !row.filled)).toBe(true);
    type View = Props<typeof props, typeof meta>;
    expectTypeOf<View["cells"][number]["title"]>().toEqualTypeOf<string>();
    expectTypeOf<View>().not.toBeAny();
    expectTypeOf<View>().not.toHaveProperty("color");
  });
});
describe("MealPlan fallback and contract", () => {
  const casts: CastLike[] = [
    { things: [], items: [] },
    {
      things: [{ type: "record", fields: ["name"] }],
      items: [{ id: "one", type: "record", sample: true, name: "Fern" }],
    },
    {
      things: [{ type: "record", fields: ["name"] }],
      items: [{ id: "one", type: "record", sample: true, name: 4 }],
    },
    {
      things: [{ type: "record", fields: ["name"] }],
      items: Array.from({ length: 8 }, (_, index) => ({
        id: `r${index}`,
        type: "record",
        sample: true,
        name: "a".repeat(80),
      })),
    },
  ];
  it.each(casts)("validates empty, useful, malformed and long casts", (cast) =>
    expect(props.safeParse(fallback({ cast })).success).toBe(true),
  );
  it("uses cast titles or shared neutral placeholders", () => {
    expect(fallback({ cast: casts[0]! }).cells.map((row) => row.title)).toEqual([
      "Item one",
      "Item two",
      "Item three",
    ]);
    expect(fallback({ cast: casts[1]! }).cells[0]!.title).toBe("Fern");
    expect(fallback({ cast: casts[2]! }).cells[0]!.title).toBe("Item one");
    expect(fallback({ cast: casts[3]! }).cells).toHaveLength(3);
    expect(fallback({ cast: casts[3]! }).cells[0]!.title).toHaveLength(24);
  });
  it("preserves density, states, phone tier and core-first probes", () => {
    expect(meta).toMatchObject({ status: "ready", dense: true, weight: 3, tier: "phone" });
    expect(meta.states).toEqual(["filled", "empty"]);
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.realPath).not.toBe("");
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Calendar" }));
    expect(probes).toContainEqual(expect.objectContaining({ kind: "write", expect: "MealPlan" }));
    expect(probes.filter((probe) => probe.kind === "read")).toHaveLength(2);
    expect(createRegistry({ packs: ["kitchen"], includeDrafts: true }).resolve("meal-plan")).toBe("MealPlan");
  });
});

describe("MealPlan states, parts, reading and conditional actions", () => {
  it.each([1, 2, 3, 4])("draws and offers exactly one action for each of %i meal columns", (count) => {
    const meals = ["breakfast", "lunch", "dinner", "snack"].slice(0, count);
    const value = { ...input, meals, cells: [{ ...cell, day: 0, meal: meals[0] }] };
    const parsed = stampItemIds(meta, props.parse(value)) as Props<typeof props, typeof meta>;
    const offered = affordancesOf(meta, parsed, "m1");
    expect(offered).toHaveLength(7 * count);
    const html = renderInstance("MealPlan", value, "filled", theme, { component: "m1" });
    for (const part of meta.parts) expect(() => elementAt(html, `home/m1/${part}`)).not.toThrow();
    for (const row of parsedRows(parsed)) {
      const root = `home/m1/${row.id}/root`;
      expect(html.split(`data-testid="${root}"`)).toHaveLength(2);
      expect(elementAt(html, root).attributes).toContain(row.filled ? 'role="link"' : 'role="listitem"');
      const action = row.filled
        ? { address: `m1/${row.id}`, part: "root", action: "press", detail: "→recipe_overview" }
        : { address: `m1/${row.id}/add`, part: "add", action: "press", detail: "" };
      expect(offered).toContainEqual(action);
      if (row.filled) {
        const [lead, body] = elementAt(html, root).children[0]!.children;
        expect(styleAt(html, lead!)).toContain("align-self:center");
        expect(lead!.children[0]!.attributes).toContain(`data-testid="home/m1/${row.id}/photo"`);
        expect(body!.children[0]!.attributes).toContain(`data-testid="home/m1/${row.id}/title"`);
        expect(styleAt(html, `home/m1/${row.id}/title`)).toContain("-webkit-line-clamp:2");
        expect(html).not.toContain(`data-testid="home/m1/${row.id}/add"`);
      } else expect(elementAt(html, `home/m1/${row.id}/add`).attributes).toContain('role="button"');
    }
  });
});
describe("MealPlan read and act", () => {
  it("reads recipes and add targets at the same stable day-first addresses as the screen", () => {
    const reading = readComponent(components.MealPlan, input, "m1").join("\n");
    expect(reading).toContain("r8: Thursday Dinner · Nonna's lasagne");
    expect(reading).toContain("[m1/r8 press→recipe_overview]");
    expect(reading).toContain("r1: Monday Lunch · Add");
    expect(reading).toContain("[m1/r1/add press]");
  });
  it("draws recipes without optional photos and empty plans with all add cells", () => {
    const { photo: _photo, ...noPhoto } = cell;
    const noPhotoHtml = renderInstance("MealPlan", { ...input, cells: [noPhoto] }, "filled", theme);
    expect(noPhotoHtml).not.toContain('data-testid="home/c1/r8/photo"');
    expect(noPhotoHtml).not.toContain('role="image" aria-label="food"');
    const html = renderInstance("MealPlan", { ...input, cells: [] }, "filled", theme);
    expect(html.match(/role="button"/g)).toHaveLength(14);
  });
  it("renders a shared calm empty state without stale recipes or controls", () => {
    const html = renderInstance("MealPlan", input, "empty", theme, { thing: "meal" });
    expect(html).toContain("No meals yet");
    expect(html).not.toContain("Nonna");
    expect(html).not.toContain('role="button"');
    expect(meta.read(props.parse(input), "empty")).toEqual([]);
  });
  it("navigates filled recipes and dispatches empty add presses, rejecting swapped targets", () => {
    const screen = { id: "home", components: [{ id: "m1", c: "MealPlan", ...input }] };
    const onLink = vi.fn();
    const runtime = createScreenController({ screen, defs: components, onLink });
    const agent = createAgentAccess({
      current: () => screen,
      defs: components,
      store: runtime.store,
      runtime,
    });
    expect(agent.act({ address: "m1/r8", action: "press" }).ok).toBe(true);
    expect(onLink).toHaveBeenCalledExactlyOnceWith("recipe_overview", "home/m1/r8");
    expect(agent.act({ address: "m1/r1/add", action: "press" }).ok).toBe(true);
    expect(agent.act({ address: "m1/r8/add", action: "press" }).ok).toBe(false);
    expect(agent.act({ address: "m1/r1", action: "press" }).ok).toBe(false);
    expect(agent.act({ address: "m1/r15/add", action: "press" }).ok).toBe(false);
    runtime.dispose();
  });
});

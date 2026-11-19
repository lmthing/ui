import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";
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
import { elementAt, renderInstance } from "../../../../test/render";

const { props, meta, examples, fallback, probes } = components.HabitGrid;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const habit = { name: "Check Fern", icon: "leaf", days: Array<boolean>(7).fill(false) };
const input = { habits: [habit] };
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 19, 12));
});
afterEach(() => vi.useRealTimers());

describe("HabitGrid schema and boundaries", () => {
  it.each(examples)("accepts each domain example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("trims names and derives cell values without changing the written week", () => {
    const parsed = props.parse({ habits: [{ ...habit, name: "  Check Fern  " }] });
    expect(parsed.habits[0]).toMatchObject({
      name: "Check Fern",
      day_1: { done: false },
      past_4: true,
      past_5: false,
    });
    expect(parsed.habits[0]!.days).toEqual(habit.days);
  });
  it.each([
    {},
    { habits: [] },
    { habits: Array(7).fill(habit) },
    { habits: [{ ...habit, name: "" }] },
    { habits: [{ ...habit, name: " " }] },
    { habits: [{ ...habit, name: "a".repeat(21) }] },
    { habits: [{ ...habit, icon: "unknown" }] },
    { habits: [{ ...habit, days: Array(6).fill(false) }] },
    { habits: [{ ...habit, days: Array(8).fill(false) }] },
    { habits: [{ ...habit, days: [true, false, false, false, false, false, "false"] }] },
    { habits: [{ ...habit, id: "r1" }] },
    { habits: [{ ...habit, streak: 7 }] },
    { habits: [{ ...habit, past_7: true }] },
    { habits: [{ ...habit, day_1: { done: true } }] },
    { ...input, today: 6 },
    { ...input, color: "red" },
    { ...input, size: 44 },
  ])("rejects invalid and presentation-owned input", (value) =>
    expect(props.safeParse(value).success).toBe(false),
  );
  it("accepts exact maximum name and row count with validator-only ids", () => {
    expect(props.safeParse({ habits: Array(6).fill({ ...habit, name: "a".repeat(20) }) }).success).toBe(true);
    type View = Props<typeof props, typeof meta>;
    expectTypeOf<View["habits"][number]["id"]>().toEqualTypeOf<string>();
    expectTypeOf<View>().not.toBeAny();
    expectTypeOf<View>().not.toHaveProperty("color");
    expect(stampItemIds(meta, props.parse(input)).habits[0]).toMatchObject({ id: "r1" });
  });
});

describe("HabitGrid fallback and contract", () => {
  const casts: CastLike[] = [
    { things: [], items: [] },
    {
      things: [{ type: "plant", fields: ["name"] }],
      items: [{ id: "fern", type: "plant", sample: true, name: "Fern" }],
    },
    {
      things: [{ type: "plant", fields: ["name"] }],
      items: [{ id: "fern", type: "plant", sample: true, name: 4 }],
    },
    {
      things: [{ type: "plant", fields: ["name"] }],
      items: Array.from({ length: 8 }, (_, index) => ({
        id: `p${index}`,
        type: "plant",
        sample: true,
        name: "a".repeat(80),
      })),
    },
  ];
  it.each(casts)("validates empty, useful, malformed and long casts", (cast) =>
    expect(props.safeParse(fallback({ cast })).success).toBe(true),
  );
  it("uses cast names or shared neutral placeholders, never invented habits", () => {
    expect(fallback({ cast: casts[0]! }).habits.map((row) => row.name)).toEqual(["Item one", "Item two"]);
    expect(fallback({ cast: casts[1]! }).habits[0]!.name).toBe("Fern");
    expect(fallback({ cast: casts[2]! }).habits[0]!.name).toBe("Item one");
    expect(fallback({ cast: casts[3]! }).habits).toHaveLength(2);
    expect(fallback({ cast: casts[3]! }).habits[0]!.name).toHaveLength(20);
    expect(fallback({ cast: casts[0]! }).habits.every((row) => row.days.every((done) => !done))).toBe(true);
  });
  it("preserves density, phone tier, states, and the core-first near miss", () => {
    expect(meta).toMatchObject({
      status: "ready",
      dense: true,
      weight: 3,
      tier: "phone",
      states: ["filled", "empty"],
    });
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.realPath).not.toBe("");
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Streak" }));
    expect(probes).toContainEqual(expect.objectContaining({ kind: "write", expect: "HabitGrid" }));
    expect(probes).toContainEqual(
      expect.objectContaining({
        kind: "read",
        expect: { address: "h1/r1/day_1", action: "check" },
      }),
    );
    const registry = createRegistry({ packs: ["health"], includeDrafts: true });
    expect(registry.resolve("habit-grid")).toBe("HabitGrid");
  });
});

describe("HabitGrid states, parts, read and actions", () => {
  it.each([0, 1, 2, 3, 4, 5, 6])("offers past/today checks only on weekday %i", (today) => {
    vi.setSystemTime(new Date(2026, 10, 16 + today, 12));
    const value = { habits: [habit, { ...habit, name: "Mist leaves", days: Array<boolean>(7).fill(true) }] };
    const parsed = stampItemIds(meta, props.parse(value)) as Props<typeof props, typeof meta>;
    const offered = affordancesOf(meta, parsed, "h1");
    expect(offered).toHaveLength((today + 1) * 2);
    const html = renderInstance("HabitGrid", value, "filled", theme, { component: "h1" });
    for (const row of parsed.habits) {
      for (const part of meta.items.parts)
        expect(() => elementAt(html, `home/h1/${row.id}/${part}`)).not.toThrow();
      for (let day = 0; day < 7; day++) {
        const cell = elementAt(html, `home/h1/${row.id}/day_${day + 1}`).attributes;
        expect(cell).toContain('role="checkbox"');
        expect(cell.includes('aria-disabled="true"')).toBe(day > today);
        expect(offered.some((action) => action.address === `h1/${row.id}/day_${day + 1}`)).toBe(day <= today);
      }
    }
    expect(readComponent(components.HabitGrid, value, "h1").join("\n")).toContain(`${today + 1} day`);
  });
  it.each([
    [Array(7).fill(false), "0 days"],
    [[true, true, true, true, true, true, true], "4 days"],
    [[true, true, true, false, true, true, true], "3 days"],
    [[true, false, true, true, false, false, false], "2 days"],
    [[true, true, false, false, true, true, true], "0 days"],
  ])("computes only the current week's consecutive run", (days, expected) => {
    expect(meta.read(props.parse({ habits: [{ ...habit, days }] }), "filled")).toContain(expected);
  });
  it("renders a calm empty message with no cell controls or stale habits", () => {
    const html = renderInstance("HabitGrid", input, "empty", theme, { thing: "habit" });
    expect(html).toContain("No habits yet");
    expect(html).not.toContain('role="checkbox"');
    expect(html).not.toContain("Check Fern");
    expect(meta.read(props.parse(input), "empty")).toEqual([]);
  });
  it("checks and unchecks independent cells, rejects future days, and keeps failed batches atomic", () => {
    const screen = { id: "home", components: [{ id: "h1", c: "HabitGrid", ...input }] };
    const runtime = createScreenController({ screen, defs: components });
    const agent = createAgentAccess({
      current: () => screen,
      defs: components,
      store: runtime.store,
      runtime,
    });
    const step = { address: "h1/r1/day_1", action: "check" };
    expect(agent.act(step).ok).toBe(true);
    expect(runtime.store.get("home/h1/r1/day_1")).toBe(true);
    expect(agent.read()).toContain("h1/r1/day_1 check:done");
    expect(agent.act(step).ok).toBe(true);
    expect(runtime.store.get("home/h1/r1/day_1")).toBe(false);
    expect(agent.act({ ...step, value: true }).ok).toBe(true);
    expect(agent.act({ address: "h1/r1/day_2", action: "check" }).ok).toBe(true);
    const before = runtime.store.snapshot();
    expect(agent.act([step, { address: "h1/r1/day_5", action: "check" }]).ok).toBe(false);
    expect(runtime.store.snapshot()).toEqual(before);
    expect(agent.act({ ...step, value: "yes" }).ok).toBe(false);
    runtime.dispose();
  });
});

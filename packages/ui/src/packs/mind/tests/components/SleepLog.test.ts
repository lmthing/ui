import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  packReady,
  readComponent,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const { props, meta, examples, fallback, probes } = components.SleepLog;
const night = examples[0]!;
const bare = examples[1]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const emptyCast: CastLike = { things: [], items: [] };
const castOf = (first: unknown, second: unknown): CastLike => ({
  things: [{ type: "record", fields: ["first", "second"] }],
  items: [{ id: "one", type: "record", sample: true, first, second }],
});
const edit = [{ address: "s1/edit", action: "press", part: "edit", detail: "→sleep_log" }];

describe("SleepLog schema and boundaries", () => {
  it.each(examples)("accepts a real example", (example) => {
    expect(props.safeParse(example).success).toBe(true);
  });
  it("defaults finish and detail and keeps week data when the average is hidden", () => {
    expect(props.parse(night)).toMatchObject({ surface: "card", detail: "full" });
    expect(props.parse({ ...night, detail: "brief" }).week).toEqual(night.week);
  });
  it.each([
    {},
    { bed: undefined },
    { bed: "24:00" },
    { wake: "06:60" },
    { wake: "6:45" },
    { awake: -1 },
    { awake: 0.5 },
    { awake: 481 },
    { awake: 1440 },
    { quality: 0 },
    { quality: 2.5 },
    { quality: 6 },
    { week: Array(6).fill(8) },
    { week: Array(8).fill(8) },
    { week: [7, 7, -1, 7, 7, 7, 7] },
    { week: [7, 7, 24.1, 7, 7, 7, 7] },
    { week: [7, 7, NaN, 7, 7, 7, 7] },
    { goto: undefined },
    { goto: "Bad ID" },
    { goto: "a".repeat(65) },
    { detail: "summary" },
    { density: "dense" },
    { surface: "shadow" },
    { color: "#ffffff" },
    { pixels: 4 },
    { duration: 450 },
    { average: 441 },
  ])("rejects invalid input %j", (change) =>
    expect(props.safeParse(Object.keys(change).length ? { ...night, ...change } : change).success).toBe(
      false,
    ),
  );
  it("accepts exact overnight, equal-time and weekly limits", () => {
    expect(
      props.safeParse({
        bed: "00:01",
        wake: "00:00",
        awake: 1439,
        quality: 5,
        week: [0, 24, 0.5, 24, 0, 0, 0],
        goto: "a".repeat(64),
      }).success,
    ).toBe(true);
    expect(props.safeParse({ ...night, wake: night.bed, awake: 0, quality: 1 }).success).toBe(true);
    expect(props.safeParse({ ...night, wake: night.bed, awake: 1 }).success).toBe(false);
    expect(props.safeParse({ ...night, awake: 480 }).success).toBe(true);
    expectTypeOf<Props<typeof props, typeof meta>>().not.toBeAny();
    expectTypeOf<Props<typeof props, typeof meta>>().not.toHaveProperty("average");
  });
});

describe("SleepLog fallback and contract", () => {
  it("uses cast clocks when available and a neutral clock otherwise", () => {
    const full = castOf("22:25", "06:20");
    const mixed = castOf("Notes", "07:10");
    const malformed = castOf("24:90", 7);
    for (const cast of [full, mixed, malformed, emptyCast]) {
      expect(props.safeParse(fallback({ cast })).success).toBe(true);
    }
    expect(fallback({ cast: full })).toEqual({ bed: "22:25", wake: "06:20", goto: "sleep_log" });
    expect(fallback({ cast: mixed })).toMatchObject({ bed: "07:10", wake: "07:10" });
    for (const cast of [malformed, emptyCast])
      expect(fallback({ cast })).toMatchObject({ bed: "00:00", wake: "00:00" });
  });
  it("keeps the core-first near miss, permission tier, and variant probe", () => {
    expect(meta.status).toBe("ready");
    expect(meta.tier).toBe("phone");
    expect(meta.partTiers).toEqual({ import: "ok" });
    expect(meta.states).toEqual(["filled", "empty"]);
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(probes.filter((probe) => probe.kind === "choose").map((probe) => probe.expect)).toEqual([
      "SleepLog",
      "Timeline",
    ]);
    expect(probes).toContainEqual(
      expect.objectContaining({
        kind: "write",
        expect: "SleepLog",
        variant: { axis: "detail", value: "brief" },
      }),
    );
    expect(probes).toContainEqual(
      expect.objectContaining({ kind: "read", expect: { address: "s1/edit", action: "press" } }),
    );
    expect(createRegistry({ packs: ["mind"] }).ids.includes("SleepLog")).toBe(packReady("mind"));
  });
});

describe("SleepLog states, parts and read/act", () => {
  it("draws the complete night without offering edits to static parts", () => {
    const html = renderInstance("SleepLog", night, "filled", theme);
    const parts = addressedElements(html);
    const read = readComponent(components.SleepLog, night, "s1").join("\n");
    for (const part of ["root", "bed", "wake", "duration", "night", "quality", "average", "edit", "import"]) {
      expect(parts.has(`home/c1/${part}`), part).toBe(true);
      expect(html.match(new RegExp(`data-testid="home/c1/${part}"`, "g"))).toHaveLength(1);
    }
    expect(parts.get("home/c1/edit")?.attributes).toContain('role="button"');
    expect(parts.get("home/c1/quality")?.attributes).toContain('aria-label="Good"');
    for (const text of [
      "7 h 30 min",
      "7 h 21 min",
      "94% asleep",
      "30 min awake",
      "Only phone import needs permission",
    ]) {
      expect(html).toContain(text);
      expect(read).toContain(text);
    }
    expect(affordancesOf(meta, props.parse(night), "s1")).toEqual(edit);
  });
  it("keeps optional parts and brief reading in step with rendering", () => {
    const brief = { ...night, detail: "brief" } as const;
    for (const input of [bare, brief]) {
      const html = renderInstance("SleepLog", input, "filled", theme);
      expect(addressedElements(html).has("home/c1/average")).toBe(false);
      expect(readComponent(components.SleepLog, input, "s1").join("\n")).not.toContain("7-night average");
    }
    const parts = addressedElements(renderInstance("SleepLog", bare, "filled", theme));
    expect(parts.has("home/c1/quality")).toBe(false);
    expect(parts.has("home/c1/night")).toBe(true);
    const zero = renderInstance("SleepLog", { ...night, wake: night.bed, awake: 0 }, "filled", theme);
    expect(zero).toContain("0% asleep");
    expect(zero).not.toContain("NaN");
  });
});

describe("SleepLog edit action", () => {
  it.each(["filled", "empty"] as const)("dispatches only edit navigation in %s", (state) => {
    const html = renderInstance("SleepLog", night, state, theme, { thing: "night" });
    if (state === "empty") {
      const parts = addressedElements(html);
      expect([...parts.keys()].sort()).toEqual(
        ["edit", "edit_label", "empty", "root"].map((part) => `home/c1/${part}`),
      );
      expect(html).toContain("No nights yet");
      expect(html).toContain("Log sleep");
      expect(html).not.toContain("Edit sleep times");
      expect(meta.read(night, state, "en")).toEqual(['"Log sleep"']);
    }
    expect(readComponent(components.SleepLog, night, "s1", state).join("\n")).toContain("[s1/edit press");
    const onLink = vi.fn();
    const controller = createScreenController({
      screen: { id: "home", components: [{ id: "s1", c: "SleepLog", state, ...night }] },
      defs: components,
      onLink,
      requireMounted: false,
    });
    expect(controller.press("home/s1/edit").ok).toBe(true);
    expect(onLink).toHaveBeenCalledExactlyOnceWith("sleep_log", "home/s1/edit");
    for (const part of ["import", "quality", "average", "night"])
      expect(controller.press(`home/s1/${part}`).ok).toBe(false);
    controller.dispose();
  });
});

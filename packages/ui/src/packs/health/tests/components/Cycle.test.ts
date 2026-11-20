import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  emptyLine,
  readComponent,
  stampItemIds,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { cycleLabels, cycleReading, cycleToday } from "../../copy";
import { elementAt, renderInstance } from "../../../../../test/render";

const { props, meta, examples, fallback, probes } = components.Cycle;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const seed = { start: "2026-11-01", length: 28, period: 5 };
afterEach(() => vi.useRealTimers());

describe("Cycle contract and boundaries", () => {
  it.each(examples)("accepts a real domain example", (input) =>
    expect(props.safeParse(input).success).toBe(true),
  );
  it.each([
    {},
    { ...seed, start: "" },
    { ...seed, start: "2026-2-01" },
    { ...seed, start: "2026-02-29" },
    { ...seed, start: "2026-04-31" },
    { ...seed, start: "2026-13-01" },
    { ...seed, start: "2026-11-01T00:00:00Z" },
    { ...seed, length: 20 },
    { ...seed, length: 41 },
    { ...seed, length: 28.5 },
    { ...seed, length: Infinity },
    { ...seed, period: 1 },
    { ...seed, period: 11 },
    { ...seed, period: 5.5 },
    { ...seed, period: "5" },
    { ...seed, color: "#fff" },
    { ...seed, day: 19 },
    { ...seed, phase: "luteal" },
    { ...seed, next: "2026-11-29" },
    { ...seed, window: "2026-11-10" },
    { ...seed, id: "c1" },
  ])("rejects invalid or model-written derived input", (input) =>
    expect(props.safeParse(input).success).toBe(false),
  );
  it.each([21, 40])("accepts exact length %s and both period boundaries", (length) => {
    for (const period of [2, 10]) {
      const input = { start: "2024-02-29", length, period };
      expect(props.safeParse(input).success).toBe(true);
      expect(renderInstance("Cycle", input, "filled", theme)).toContain("Next period");
    }
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["start"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps>().not.toBeAny();
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
  });
  it("retains the core-first probe and phone-only, non-destructive contract", () => {
    expect(meta.status).toBe("ready");
    expect(meta.tier).toBe("phone");
    expect(meta.weight).toBe(2);
    expect(meta.states).toEqual(["filled", "empty"]);
    expect(meta.realPath).toContain("never shared");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Calendar");
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Calendar")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Cycle" });
    expect(probes.find((probe) => probe.kind === "read")).toMatchObject({
      expect: { address: "c1/log", action: "press" },
    });
    expect(createRegistry({ packs: ["health"], includeDrafts: true }).schema("Cycle")).toBe(props);
    expect(createRegistry().ids).not.toContain("Cycle");
  });
});

describe("Cycle fallback", () => {
  const casts: CastLike[] = [
    { things: [], items: [] },
    {
      things: [{ type: "record", fields: ["title", "detail"] }],
      items: [{ id: "one", type: "record", sample: true, title: "Entry", detail: "2026-10-26" }],
    },
    {
      things: [{ type: "record", fields: ["title"] }],
      items: [{ id: "bad", type: "record", sample: true, title: 7 }],
    },
  ];
  it.each(casts)("validates empty, matching and malformed casts", (cast) =>
    expect(props.safeParse(fallback({ cast })).success).toBe(true),
  );
  it("uses only declared cast text and neutral numeric defaults", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 19, 23, 59));
    expect(fallback({ cast: casts[0]! })).toEqual({ start: cycleToday(), length: 28, period: 5 });
    expect(fallback({ cast: casts[1]! })).toEqual({ start: "2026-10-26", length: 28, period: 5 });
    expect(fallback({ cast: casts[2]! })).toEqual(fallback({ cast: casts[0]! }));
  });
});

describe("Cycle states, parts and reading", () => {
  it.each(examples)("addresses every filled part once and reads every visible line", (input) => {
    const html = renderInstance("Cycle", input, "filled", theme);
    const hidden = input.detail === "brief" ? meta.variantParts["detail.brief"].hides : [];
    for (const part of meta.parts)
      expect(html.match(new RegExp(`data-testid="home/c1/${part}"`, "g")) ?? []).toHaveLength(
        hidden.some((name) => name === part) ? 0 : 1,
      );
    expect(elementAt(html, "home/c1/log").attributes).toContain('role="button"');
    const reading = readComponent(components.Cycle, input, "c1").join("\n");
    for (const line of cycleReading(input)) {
      expect(html).toContain(line);
      expect(reading).toContain(line);
    }
    expect(reading).toContain("[c1/log press]");
    expect(reading).not.toContain("[c1 press]");
    expect(affordancesOf(meta, stampItemIds(meta, props.parse(input)), "c1")).toEqual([
      { address: "c1/log", part: "log", action: "press", detail: "" },
    ]);
  });
  it("keeps the empty state calm, addressed and free of predictions or controls", () => {
    const html = renderInstance("Cycle", seed, "empty", theme, "record");
    expect(html.match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
    expect(html).toContain(emptyLine("record"));
    expect(html).toContain(cycleLabels.empty);
    expect(html).not.toContain('role="button"');
    expect(html).not.toContain('data-testid="home/c1/log"');
    expect(html).not.toContain("Next period");
    expect(meta.read(seed, "empty")).toEqual([]);
    expect(readComponent(components.Cycle, seed, "c1", "empty")).toEqual(["c1 Cycle (empty)"]);
  });
});

it("dispatches repeated period-log requests only from the declared filled action", () => {
  const onAction = vi.fn();
  const runtime = createScreenController({
    screen: {
      id: "home",
      components: [
        { id: "c1", c: "Cycle", ...seed },
        { id: "c2", c: "Cycle", ...seed, state: "empty" },
      ],
    },
    defs: components,
    onAction,
  });
  try {
    expect(runtime.press("home/c1/day")).toMatchObject({ ok: false });
    expect(runtime.press("home/c1/root")).toMatchObject({ ok: false });
    expect(runtime.press("home/c2/log")).toMatchObject({ ok: false });
    expect(runtime.press("home/c1/log")).toMatchObject({ ok: true });
    expect(runtime.act({ address: "c1/log", action: "press" })).toMatchObject({ ok: true });
    expect(onAction).toHaveBeenCalledTimes(2);
    expect(onAction).toHaveBeenLastCalledWith({ address: "home/c1/log", action: "press" });
    expect(runtime.snapshotScreen().components[0]).toMatchObject(seed);
    expect(runtime.read()).toContain("[c1/log press]");
  } finally {
    runtime.dispose();
  }
});

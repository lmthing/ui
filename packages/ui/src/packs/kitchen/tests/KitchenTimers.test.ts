import { describe, expect, expectTypeOf, it } from "vitest";
import { components, readComponent, type CastLike, type Props } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { elementAt, renderInstance } from "../../../../test/render";
const { meta, props, fallback, examples, probes } = components.KitchenTimers;
const seed = { label: "First", seconds: 90 };
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
type Timer = Props<typeof props, typeof meta>["timers"][number];

describe("KitchenTimers contract and boundaries", () => {
  it.each(examples)("accepts each domain example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it.each([
    {},
    { timers: [] },
    { timers: Array.from({ length: 7 }, () => seed) },
    { timers: [seed], color: "#fff" },
    ...[
      { label: " " },
      { label: "x".repeat(17) },
      { seconds: 0 },
      { seconds: 14401 },
      { seconds: 1.5 },
      { remaining: 1 },
      { remaining: -1, running: false },
      { remaining: 14401, running: false },
      { finished: "yes" },
      { id: "r1" },
      { running: true },
    ].map((field) => ({ timers: [{ ...seed, ...field }] })),
  ])("rejects missing, out-of-range and unknown fields", (input) =>
    expect(props.safeParse(input).success).toBe(false),
  );
  it("accepts exact bounds, trims the label and keeps the view id validator-owned", () => {
    const bound = { label: ` ${"x".repeat(16)} `, seconds: 14400, remaining: 0, running: false };
    expect(props.parse({ timers: [bound] }).timers[0]).toEqual({
      ...bound,
      label: bound.label.trim(),
      finished: false,
    });
    expect(
      props.safeParse({ timers: Array.from({ length: 6 }, () => ({ ...seed, seconds: 1 })) }).success,
    ).toBe(true);
    expectTypeOf<Timer["id"]>().toEqualTypeOf<string>();
    expectTypeOf<Timer>().not.toBeAny();
  });
});
describe("KitchenTimers fallback and metadata", () => {
  it("accepts empty, matching and malformed casts, bounding cast labels and row count", () => {
    const empty = { things: [], items: [] };
    const item = { id: "a", type: "record", sample: true };
    const matching = {
      things: [{ type: "record", fields: ["name"] }],
      items: [
        { ...item, name: "Named" },
        ...Array.from({ length: 5 }, (_, i) => ({ ...item, id: `a${i}`, name: "x".repeat(30) })),
      ],
    };
    const malformed: CastLike = { things: [], items: [{ ...item, name: 42 }] };
    for (const cast of [empty, matching, malformed])
      expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: empty }).timers.map(({ label }) => label)).toEqual(["Item one", "Item two"]);
    expect(fallback({ cast: matching }).timers.map(({ label }) => label)).toEqual([
      "Named",
      "x".repeat(16),
      "x".repeat(16),
    ]);
    expect(fallback({ cast: malformed }).timers[0]?.label).toBe("Item one");
  });
  it("preserves the core-first probes, phone tier, alarm risk and non-destructive actions", () => {
    expect(meta).toMatchObject({ status: "ready", weight: 2, tier: "phone", partTiers: { root: "ok" } });
    expect(meta.states).toEqual(["filled", "empty"]);
    expect(meta).not.toHaveProperty("confirmParts");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Timer");
    expect(probes.map(({ kind, expect: target }) => [kind, target])).toEqual([
      ["choose", "KitchenTimers"],
      ["choose", "Timer"],
      ["write", "KitchenTimers"],
      ["read", { address: "k1/r1", action: "start" }],
      ["read", { address: "k1/r2/more", action: "press" }],
    ]);
  });
});
describe("KitchenTimers states, parts and reading", () => {
  it("draws and reads live times in soonest-first order while keeping item addresses", () => {
    const input = { timers: [seed, { label: "Second", seconds: 120, remaining: 5, running: true }] };
    const html = renderInstance("KitchenTimers", input, "filled", theme);
    for (const row of ["r1", "r2"])
      for (const part of meta.items.parts) elementAt(html, `home/c1/${row}/${part}`);
    for (const part of ["root", "more"])
      expect(elementAt(html, `home/c1/r2/${part}`).attributes).toContain('role="button"');
    expect(html.indexOf('data-testid="home/c1/r2/seconds"')).toBeLessThan(
      html.indexOf('data-testid="home/c1/r1/seconds"'),
    );
    const reading = readComponent(components.KitchenTimers, input, "k1").join("\n");
    expect(reading).toContain("Second: 0:05 — First: 1:30");
    expect(reading).toContain('"Pause"');
    expect(reading).toContain("[k1/r1 start !needs-ok]");
    expect(reading).toContain("[k1/r2 stop !needs-ok]");
    expect(reading).toContain("[k1/r2/more press]");
  });
  it("renders zero, capped, and empty states without an enabled incompatible control", () => {
    const finished = renderInstance(
      "KitchenTimers",
      { timers: [{ ...seed, remaining: 0, running: false, finished: true }] },
      "filled",
      theme,
    );
    expect(finished).toContain("0:00");
    expect(finished).toContain("Done");
    expect(elementAt(finished, "home/c1/r1/root").attributes).toContain('aria-disabled="true"');
    const capped = renderInstance(
      "KitchenTimers",
      { timers: [{ ...seed, seconds: 14400 }] },
      "filled",
      theme,
    );
    expect(capped).toContain("4:00:00");
    expect(elementAt(capped, "home/c1/r1/more").attributes).toContain('aria-disabled="true"');
    const empty = renderInstance("KitchenTimers", examples[0], "empty", theme);
    expect(empty).toContain("Nothing here yet");
    expect(empty).not.toContain("home/c1/r1");
    expect(readComponent(components.KitchenTimers, examples[0], "k1", "empty")).toEqual([
      "k1 KitchenTimers (empty)",
    ]);
  });
});

function session(timers: unknown, state: "filled" | "empty" = "filled") {
  let now = 0;
  const runtime = createScreenController({
    screen: { id: "home", components: [{ c: "KitchenTimers", id: "k1", state, timers }] },
    defs: components,
    now: () => now,
  });
  return {
    runtime,
    at: (ms: number) => {
      now = ms;
    },
    timers: () => runtime.snapshotScreen().components[0]!.timers as Timer[],
  };
}
describe("KitchenTimers live tap and agent actions", () => {
  it("starts two independent timers and extends the same timer through both paths", () => {
    const { runtime, at, timers } = session([seed, { label: "Second", seconds: 120 }]);
    try {
      expect(runtime.actionsAt("k1/r1")).toEqual(["start"]);
      expect(runtime.press("k1/r1").ok).toBe(true);
      expect(runtime.act({ address: "k1/r2", action: "start" }, { agent: true }).ok).toBe(true);
      at(2500);
      expect(runtime.press("k1/r1/more").ok).toBe(true);
      expect(timers().map(({ remaining }) => remaining)).toEqual([148, 118]);
      expect(runtime.actionsAt("k1/r1")).toEqual(["stop"]);
      at(3000);
      expect(runtime.press("k1/r1").ok).toBe(true);
      expect(runtime.act({ address: "k1/r1/more", action: "press" }, { agent: true }).ok).toBe(true);
      at(6000);
      expect(timers().map(({ remaining }) => remaining)).toEqual([207, 114]);
      expect(timers().map(({ running }) => running)).toEqual([false, true]);
      expect(runtime.read()).toContain("Second: 1:54 — First: 3:27");
      expect(runtime.act({ address: "k1/r1", action: "stop" }).ok).toBe(false);
      expect(runtime.press("k1/r3/more").ok).toBe(false);
      expect(runtime.confirmation).toBeUndefined();
    } finally {
      runtime.dispose();
    }
  });
  it("rejects actions when empty and disallows cap and finished-state no-ops", () => {
    const empty = session([seed], "empty");
    const { runtime, at, timers } = session([
      { ...seed, seconds: 1 },
      { ...seed, seconds: 14390 },
    ]);
    try {
      expect(empty.runtime.press("k1/r1").ok).toBe(false);
      expect(empty.runtime.press("k1/r1/more").ok).toBe(false);
      expect(runtime.press("k1/r1").ok).toBe(true);
      at(1500);
      runtime.tick();
      expect(timers()[0]).toMatchObject({ remaining: 0, finished: true });
      expect(runtime.actionsAt("k1/r1")).toEqual([]);
      expect(runtime.press("k1/r1/more").ok).toBe(true);
      at(3000);
      expect(timers()[0]).toMatchObject({ remaining: 60 });
      expect(timers()[0]?.finished).not.toBe(true);
      expect(runtime.actionsAt("k1/r1")).toEqual(["start"]);
      expect(runtime.press("k1/r2/more").ok).toBe(true);
      expect(timers()[1]?.remaining).toBe(14400);
      expect(runtime.actionsAt("k1/r2/more")).toEqual([]);
      expect(runtime.act({ address: "k1/r2/more", action: "press" }).ok).toBe(false);
    } finally {
      runtime.dispose();
      empty.runtime.dispose();
    }
  });
});

import { describe, expect, expectTypeOf, it } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  emptyLine,
  loadingLabel,
  readComponent,
  slotDurationLine,
  slotEndLine,
  slotLabels,
  stampItemIds,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { elementAt, renderInstance } from "../../../../test/render";
import { createScreenController } from "@lmthing/ui/kit";

const { props, meta, examples, fallback, probes } = components.Slots;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const free = { time: "09:00", taken: false };
const seed = { times: [free], minutes: 30 };

describe("Slots contract and boundaries", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("defaults to grid and keeps validator ids out of model input", () => {
    expect(props.parse(seed)).toEqual({ ...seed, style: "grid" });
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["times"][number]["id"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps>().not.toBeAny();
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
  });
  it.each([
    {},
    { ...seed, times: [] },
    { ...seed, times: Array(25).fill(free) },
    { ...seed, times: [{ time: "9:00", taken: false }] },
    { ...seed, times: [{ time: "24:00", taken: false }] },
    { ...seed, times: [{ time: "09:60", taken: false }] },
    { ...seed, times: [{ time: "09:00 ", taken: false }] },
    { ...seed, times: [{ time: "a".repeat(6), taken: false }] },
    { ...seed, times: [{ time: "", taken: false }] },
    { ...seed, times: [{ time: "09:00", taken: "no" }] },
    { ...seed, times: [{ ...free, id: "r1" }] },
    { ...seed, times: [{ ...free, color: "#fff" }] },
    { ...seed, times: [free, free] },
    { ...seed, at: "10:00" },
    { ...seed, at: "09:00", times: [{ ...free, taken: true }] },
    { ...seed, at: "" },
    { ...seed, minutes: 4 },
    { ...seed, minutes: 601 },
    { ...seed, minutes: 30.5 },
    { ...seed, minutes: Infinity },
    { ...seed, style: "chips" },
    { ...seed, color: "#fff" },
  ])("rejects invalid input", (input) => expect(props.safeParse(input).success).toBe(false));
  it.each([5, 600])("accepts all 24 unique times with %s-minute appointments", (minutes) => {
    const times = Array.from({ length: 24 }, (_, hour) => ({
      time: `${String(hour).padStart(2, "0")}:59`,
      taken: hour !== 23,
    }));
    expect(props.safeParse({ times, at: "23:59", minutes }).success).toBe(true);
    const html = renderInstance("Slots", { times, at: "23:59", minutes }, "filled", theme);
    expect(html.match(/data-testid="home\/c1\/r\d+\/root"/g)).toHaveLength(24);
    expect(html.match(/data-testid="home\/c1\/r\d+\/time"/g)).toHaveLength(24);
    expect(elementAt(html, "home/c1/r24/root").attributes).toContain('aria-pressed="true"');
  });
});

it.each(["grid", "list"] as const)(
  "projects repeated %s selections into at and blocks taken times",
  (style) => {
    const runtime = createScreenController({
      screen: { id: "home", components: [{ id: "s1", c: "Slots", ...examples[0], style }] },
      defs: components,
    });
    try {
      expect(runtime.press("home/s1/r2/root")).toMatchObject({ ok: false });
      expect(runtime.press("home/s1/r3/root")).toMatchObject({ ok: true });
      expect(runtime.store.get("home/s1/$at")).toBe("10:00");
      expect(runtime.snapshotScreen().components[0]?.at).toBe("10:00");
      expect(runtime.act({ address: "s1/r4", action: "select", value: "10:30" })).toMatchObject({ ok: true });
      expect(runtime.snapshotScreen().components[0]?.at).toBe("10:30");
      expect(runtime.read()).toContain('[s1/r4 select = "10:30"]');
      expect(runtime.read()).not.toContain('[s1/r3 select = "10:00"]');
      const html = renderInstance(
        "Slots",
        { ...examples[0], style, at: runtime.snapshotScreen().components[0]?.at },
        "filled",
        theme,
      );
      expect(elementAt(html, "home/c1/r4/root").attributes).toContain('aria-pressed="true"');
      expect(elementAt(html, "home/c1/r3/root").attributes).toContain('aria-pressed="false"');
      expect(runtime.press("home/s1/r4/root")).toMatchObject({ ok: true });
      expect(runtime.snapshotScreen().components[0]?.at).toBe("10:30");
    } finally {
      runtime.dispose();
    }
  },
);

describe("Slots fallback", () => {
  const casts: CastLike[] = [
    { things: [], items: [] },
    {
      things: [{ type: "appointment", fields: ["label", "starts"] }],
      items: [{ id: "one", type: "appointment", sample: true, label: "Visit", starts: "13:00" }],
    },
    {
      things: [{ type: "appointment", fields: ["starts"] }],
      items: [
        { id: "one", type: "appointment", sample: false, starts: "09:00" },
        { id: "two", type: "appointment", sample: false, starts: "09:00" },
        { id: "other", type: "other", sample: true, starts: "10:00" },
      ],
    },
    { things: [], items: [{ id: "bad", type: "thing", sample: true, label: 7 }] },
  ];
  it.each(casts)("validates empty, matching, mixed and malformed cast content", (cast) =>
    expect(props.safeParse(fallback({ cast })).success).toBe(true),
  );
  it("uses declared cast text rather than guessing fields, with neutral empty placeholders", () => {
    expect(fallback({ cast: casts[0]! })).toEqual({
      times: [{ time: "00:00", taken: false }],
      minutes: 30,
    });
    expect(fallback({ cast: casts[1]! }).times).toEqual([{ time: "13:00", taken: false }]);
    expect(fallback({ cast: casts[2]! }).times).toEqual([free]);
    expect(fallback({ cast: casts[3]! })).toEqual(fallback({ cast: casts[0]! }));
  });
});

describe("Slots states, parts and read/act", () => {
  it("keeps the core near miss, write and both selectable read cases", () => {
    expect(meta.tier).toBe("phone");
    expect(meta.dense).toBe(true);
    expect(meta.weight).toBe(3);
    expect(meta.select).toEqual({ prop: "at", value: { field: "time" } });
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Calendar");
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Calendar")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Slots" });
    expect(probes.filter((probe) => probe.kind === "read")).toHaveLength(2);
    expect(createRegistry({ packs: ["booking"], includeDrafts: true }).schema("Slots")).toBe(props);
    expect(createRegistry({ packs: ["booking"] }).ids).not.toContain("Slots");
  });
});

describe("Slots selectable item parts", () => {
  it.each(["grid", "list"] as const)("offers only free %s item roots, including selected times", (style) => {
    for (const taken of [false, true]) {
      const input = { times: [free, { time: "09:30", taken }], at: "09:00", minutes: 30, style };
      const html = renderInstance("Slots", input, "filled", theme);
      expect(affordancesOf(meta, stampItemIds(meta, props.parse(input)), "s1")).toEqual([
        { address: "s1/r1", part: "root", action: "select", detail: "" },
        ...(!taken ? [{ address: "s1/r2", part: "root", action: "select", detail: "" }] : []),
      ]);
      for (const [index, slot] of input.times.entries()) {
        const base = `home/c1/r${index + 1}`;
        const root = elementAt(html, `${base}/root`);
        expect(root.attributes).toContain('role="button"');
        expect(root.attributes).toContain(`aria-disabled="${slot.taken}"`);
        expect(root.attributes).toContain(`aria-pressed="${index === 0}"`);
        expect(elementAt(html, `${base}/time`)).toEqual(root.children[0]!.children[0]);
      }
      expect(readComponent(components.Slots, input, "s1").join("\n")).toContain(slotDurationLine(30));
    }
  });
  it("keeps all-taken times readable but offers no selection", () => {
    const input = { ...seed, times: [{ ...free, taken: true }] };
    expect(affordancesOf(meta, stampItemIds(meta, props.parse(input)), "s1")).toEqual([]);
    expect(readComponent(components.Slots, input, "s1").join("\n")).toContain("09:00 (taken)");
  });
  it.each(["empty", "loading"] as const)("draws %s without item actions or text addresses", (state) => {
    const html = renderInstance("Slots", examples[0], state, theme, "appointment");
    expect(html.match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
    expect(html).not.toContain('role="button"');
    expect(html).not.toMatch(/data-testid="home\/c1\/r\d+\//);
    expect(html).toContain(state === "empty" ? slotLabels.empty : loadingLabel);
    if (state === "empty") expect(html).toContain(emptyLine("appointment"));
    expect(readComponent(components.Slots, examples[0], "s1", state)).toEqual([
      `s1 Slots ${state === "empty" ? "(empty)" : "(loading)"}`,
    ]);
  });
  it("computes list end times through midnight and preserves exact duration in the reading", () => {
    const input = examples[2]!;
    const html = renderInstance("Slots", input, "filled", theme);
    const reading = readComponent(components.Slots, input, "s1").join("\n");
    for (const line of [slotDurationLine(600), slotEndLine("23:59", 600), slotLabels.taken]) {
      expect(html).toContain(line);
      expect(reading).toContain(line);
    }
    expect(elementAt(html, "home/c1/minutes")).toBeDefined();
    expect(elementAt(html, "home/c1/times")).toBeDefined();
  });
});

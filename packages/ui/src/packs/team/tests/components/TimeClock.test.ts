import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  packReady,
  placeholderTitle,
  readComponent,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, elementAt, renderExample, renderInstance } from "../../../../../test/render";

const def = components.TimeClock;
const { props, meta, examples, fallback, probes } = def;
const active = examples[0]!;
const off = examples[1]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const empty = { things: [], items: [] } satisfies CastLike;

describe("TimeClock schema boundaries", () => {
  it.each(examples)("accepts a domain example", (example) => {
    expect(props.safeParse(example).success).toBe(true);
  });
  it("accepts the optional timestamp and a bounded shift and supplies defaults", () => {
    const shift = "x".repeat(28);
    expect(props.parse({ on: true, since: "00:00", shift: ` ${shift} ` })).toMatchObject({
      since: "00:00",
      shift,
      surface: "card",
      detail: "full",
    });
    expect(props.safeParse({ on: false }).success).toBe(true);
    type View = Props<typeof props, typeof meta>;
    expectTypeOf<View["on"]>().toEqualTypeOf<boolean>();
    expectTypeOf<View>().not.toHaveProperty("elapsed");
  });
  it.each([
    {},
    { on: "true" },
    { on: true, since: "7:00" },
    { on: true, since: "24:00" },
    { on: true, since: "07:60" },
    { on: false, shift: " " },
    { on: false, shift: "x".repeat(29) },
    { on: false, detail: "hidden" },
    { on: false, surface: "solid" },
    { on: false, density: "small" },
    { on: true, elapsed: 3600 },
    { on: true, breaks: 1 },
    { on: true, events: [] },
    { on: true, color: "#000" },
  ])("rejects invalid or unknown input %j", (input) => {
    expect(props.safeParse(input).success).toBe(false);
  });
});

describe("TimeClock fallback and metadata", () => {
  it("uses the cast, or neutral placeholder copy when nothing is usable", () => {
    const cast: CastLike = {
      things: [{ type: "shift", fields: ["name"] }],
      items: [{ id: "opening", type: "shift", sample: true, name: "Opening" }],
    };
    const malformed: CastLike = {
      things: [],
      items: [{ id: "opening", type: "shift", sample: true, name: 42 }],
    };
    for (const fixture of [cast, empty, malformed])
      expect(props.safeParse(fallback({ cast: fixture })).success).toBe(true);
    expect(fallback({ cast })).toEqual({ on: false, shift: "Opening" });
    for (const fixture of [empty, malformed])
      expect(fallback({ cast: fixture })).toEqual({ on: false, shift: placeholderTitle(0) });
  });
  it("preserves the phone tier, core near miss and scoped registry contract", () => {
    expect(meta.tier).toBe("phone");
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Timer");
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "TimeClock" }),
        expect.objectContaining({ kind: "choose", expect: "Timer" }),
        expect.objectContaining({
          kind: "write",
          expect: "TimeClock",
          variant: { axis: "detail", value: "brief" },
        }),
        expect.objectContaining({ kind: "read", expect: { address: "t1/break", action: "press" } }),
      ]),
    );
    expect(createRegistry({ packs: ["team"], includeDrafts: true }).schema("TimeClock")).toBe(props);
    expect(createRegistry({ packs: ["team"] }).ids.includes("TimeClock")).toBe(packReady("team"));
  });
});

describe("TimeClock states, parts and reading", () => {
  it("addresses the readout and active controls and keeps the same text in the reading", () => {
    const { html, props: parsed, deviceData } = renderExample("TimeClock", active, "filled", theme);
    expect([...addressedElements(html).keys()].sort()).toEqual(
      meta.parts.map((part) => `home/c1/${part}`).sort(),
    );
    const reading = readComponent(def, parsed, "t1", "filled", {}, undefined, deviceData).join("\n");
    for (const line of ["Clocked in at 07:00", "2:35:00", "1 break today", "Clock out", "Start break"]) {
      expect(html).toContain(line);
      expect(reading).toContain(line);
    }
    for (const part of ["clock", "break"]) {
      expect(elementAt(html, `home/c1/${part}`).attributes).toContain('role="button"');
      expect(reading).toContain(`[t1/${part} press]`);
    }
  });
  it("preserves finish addresses; brief hides since without removing the input or metrics", () => {
    const { html, deviceData } = renderExample("TimeClock", active, "filled", theme);
    const addresses = (input: unknown) => [
      ...addressedElements(renderInstance("TimeClock", input, "filled", theme, { deviceData })).keys(),
    ];
    const standard = [...addressedElements(html).keys()];
    expect(addresses({ ...active, density: "compact" })).toEqual(standard);
    expect(addresses({ ...active, surface: "outlined" })).toEqual(standard);
    const brief = { ...active, detail: "brief" };
    expect(props.parse(brief).since).toBe(active.since);
    expect(addresses(brief)).toEqual(standard.filter((address) => !address.endsWith("/since")));
    const reading = readComponent(def, brief, "t1", "filled", {}, undefined, deviceData).join("\n");
    expect(reading).not.toContain("07:00");
    expect(reading).toContain("2:35:00");
    expect(reading).toContain("1 break today");
    expect(reading).toContain("[t1/break press]");
  });
  it("shows a clock-in action when off or a read-only receipt after clock-out", () => {
    const idle = renderInstance("TimeClock", off, "filled", theme);
    const { html: receipt, props: parsed, deviceData } = renderExample("TimeClock", active, "success", theme);
    expect(idle).toContain("Clock in");
    for (const part of ["break", "since", "elapsed"])
      expect(addressedElements(idle).has(`home/c1/${part}`)).toBe(false);
    expect(receipt).toContain("Clocked out");
    expect(receipt).toContain("2:35:00");
    for (const part of ["since", "clock", "break"])
      expect(addressedElements(receipt).has(`home/c1/${part}`)).toBe(false);
    const reading = readComponent(def, parsed, "t1", "success", {}, undefined, deviceData).join("\n");
    expect(reading).toContain("Clocked out");
    expect(reading).toContain("2:35:00");
    expect(reading).not.toContain(" press]");
  });
  it("keeps the active controls but omits metrics when the host supplies no records", () => {
    const html = renderInstance("TimeClock", active, "filled", theme);
    const parts = addressedElements(html);
    const reading = readComponent(def, active, "t1").join("\n");
    for (const part of ["elapsed", "elapsed_label", "breaks"])
      expect(parts.has(`home/c1/${part}`)).toBe(false);
    for (const line of ["Clocked in at 07:00", "Clock out", "Start break"]) {
      expect(html).toContain(line);
      expect(reading).toContain(line);
    }
    expect(reading).not.toContain("2:35:00");
    expect(reading).not.toContain("1 break today");
  });
  it("labels an open break as End break at the same address", () => {
    const fixture = meta.previewDeviceData({ input: active, state: "filled" });
    const record = fixture.shiftClock![0] as { events: unknown[] };
    const deviceData = { shiftClock: [{ ...record, events: record.events.slice(0, -1) }] };
    const html = renderInstance("TimeClock", active, "filled", theme, { deviceData });
    expect(elementAt(html, "home/c1/break").attributes).toContain('aria-label="End break"');
    const reading = readComponent(def, active, "t1", "filled", {}, undefined, deviceData).join("\n");
    expect(reading).toContain("On break");
    expect(reading).toContain("End break");
    expect(reading).toContain("[t1/break press]");
  });
});

describe("TimeClock action dispatch", () => {
  it.each([
    { seed: active, state: "filled", allowed: ["clock", "break"] },
    { seed: off, state: "filled", allowed: ["clock"] },
    { seed: active, state: "success", allowed: [] },
  ] as const)("dispatches only the addressed controls in $state", ({ seed, state, allowed }) => {
    const onAction = vi.fn();
    const screen = { id: "home", components: [{ ...seed, id: "t1", c: "TimeClock", state }] };
    const controller = createScreenController({ screen, defs: components, onAction });
    const targets: readonly string[] = allowed;
    expect(affordancesOf(meta, props.parse(seed), "t1", {}, state).map((action) => action.part)).toEqual(
      targets,
    );
    for (const part of ["clock", "break", "elapsed", "clock_label"])
      expect(controller.press(`t1/${part}`)).toMatchObject({ ok: targets.includes(part) });
    expect(controller.confirmation).toBeUndefined();
    expect(onAction.mock.calls.map(([action]) => action)).toEqual(
      targets.map((part) => ({ address: `home/t1/${part}`, action: "press" })),
    );
    controller.dispose();
  });
});

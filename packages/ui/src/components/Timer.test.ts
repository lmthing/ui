import { describe, expect, expectTypeOf, it } from "vitest";
import { renderInstance } from "../../test/render";
import {
  affordancesOf,
  components,
  createRegistry,
  readComponent,
  leftLine,
  timerLabels,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";

const { props, meta, examples, fallback, probes } = components.Timer;
const input = { label: "Activity", seconds: 600 };

describe("Timer schema", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("applies defaults and trims text", () => {
    expect(props.parse({ ...input, label: " Activity " })).toEqual({
      style: "down",
      label: "Activity",
      seconds: 600,
      controls: true,
    });
  });
  it.each([
    {},
    { seconds: 600 },
    { label: "Activity" },
    { ...input, seconds: -1 },
    { ...input, seconds: 86401 },
    { ...input, seconds: 0.5 },
    { ...input, seconds: "600" },
    { ...input, seconds: Number.NaN },
    { ...input, seconds: Infinity },
    { ...input, label: "" },
    { ...input, label: " ".repeat(4) },
    { ...input, label: "a".repeat(25) },
    { ...input, style: "clock" },
    { ...input, color: "red" },
    { ...input, pixels: 4 },
    { ...input, goto: "activity" },
    { ...input, id: "t1" },
    { ...input, controls: true },
    { label: "Trip", style: "until" },
    { label: "Trip", style: "until", until: "2030-02-30" },
    { label: "Trip", style: "until", until: "2030-6-14" },
    { label: "Trip", style: "until", until: "2030-06-14", at: "24:00" },
    { label: "Trip", style: "until", until: "2030-06-14", seconds: 60 },
    { ...input, until: "2030-06-14" },
    { ...input, at: "10:00" },
  ])("rejects invalid input", (value) => expect(props.safeParse(value).success).toBe(false));
  it("accepts exact text and duration limits in both directions", () => {
    for (const style of ["down", "up"])
      for (const seconds of [0, 59, 60, 3599, 3600, 86400])
        expect(props.safeParse({ style, seconds, label: "a".repeat(24) }).success).toBe(true);
  });
  it("types view props without items or visual overrides", () => {
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["seconds"]>().toEqualTypeOf<number | undefined>();
    expectTypeOf<ViewProps["style"]>().toEqualTypeOf<"down" | "up" | "until">();
    expectTypeOf<ViewProps>().not.toBeAny();
    expectTypeOf<ViewProps>().not.toHaveProperty("color");
    expectTypeOf<ViewProps>().not.toHaveProperty("rows");
  });
});

describe("Timer fallback", () => {
  it("validates empty, full, mixed and malformed cast content", () => {
    const casts: CastLike[] = [
      { things: [], items: [] },
      {
        things: [{ type: "plant", fields: ["name"] }],
        items: [{ id: "fern", type: "plant", sample: true, name: "Fern" }],
      },
      {
        things: [
          { type: "walk", fields: [] },
          { type: "plant", fields: [] },
        ],
        items: [{ id: "fern", type: "plant", sample: false, name: "Fern" }],
      },
      { things: [{ type: "x".repeat(80), fields: [] }], items: [] },
      { things: [{ type: " ", fields: [] }], items: [] },
      { things: [], items: [{ id: "fern", type: "plant", sample: true, name: 4 }] },
    ];
    for (const cast of casts) {
      expect(props.safeParse(fallback({ cast })).success).toBe(true);
      expect(fallback({ cast })).toMatchObject({ style: "up", seconds: 0 });
    }
    expect(fallback({ cast: casts[0]! }).label).toBe("Item one");
    expect(fallback({ cast: casts[1]! }).label).toBe("plant");
    expect(fallback({ cast: casts[2]! }).label).toBe("walk");
    expect(fallback({ cast: casts[3]! }).label).toBe("x".repeat(24));
    expect(fallback({ cast: casts[4]! }).label).toBe("Item one");
    expect(fallback({ cast: casts[5]! }).label).toBe("Item one");
  });
});

describe("Timer metadata and probes", () => {
  it("declares the required parts, state and actions", () => {
    expect(meta).toMatchObject({
      id: "Timer",
      group: "data",
      region: "body",
      weight: 2,
      tier: "phone",
      parts: ["root", "time", "label", "start", "stop"],
      states: ["filled"],
      actions: { parts: { start: ["start"], stop: ["stop"] } },
    });
    for (const example of examples)
      expect(affordancesOf(meta, props.parse(example), "t1")).toEqual(
        example.style === "until"
          ? []
          : [
              { address: "t1/start", part: "start", action: "start", detail: "" },
              { address: "t1/stop", part: "stop", action: "stop", detail: "" },
            ],
      );
  });
  it("counts down to a date with no controls and reads the time left", () => {
    const soon = new Date(Date.now() + 3 * 86400000 + 3600000).toISOString().slice(0, 10);
    const value = { style: "until", label: "Trip", until: soon };
    expect(readComponent(components.Timer, value, "t1")[0]).toMatch(/\d+ days? left|\d+ h left/);
    expect(leftLine(0)).toBe("Passed");
    expect(leftLine(86400000)).toBe("1 day left");
    expect(leftLine(5 * 86400000)).toBe("5 days left");
    expect(leftLine(7200000)).toBe("2 h left");
    expect(leftLine(60000)).toBe("1 min left");
  });
  it("accepts a dated countdown with and without a time", () => {
    expect(props.safeParse({ style: "until", label: "Trip", until: "2030-06-14" }).success).toBe(true);
    expect(props.safeParse({ style: "until", label: "Trip", until: "2030-06-14", at: "14:00" }).success).toBe(
      true,
    );
  });
  it("has a real path and well-formed choose, write and read probes", () => {
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Counter");
    expect(meta.pick).toContain("Ring");
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    for (const id of ["Timer", "Counter"])
      expect(probes.find((probe) => probe.kind === "choose" && probe.expect === id)).toBeDefined();
    expect(probes.filter((probe) => probe.kind === "write")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Timer" });
    expect(probes.find((probe) => probe.kind === "read")).toMatchObject({
      screen: 0,
      task: "Start the timer",
      expect: { address: "t1/start", action: "start" },
    });
  });
  it("builds a data-only registry with separator-tolerant aliases", () => {
    const registry = createRegistry();
    expect(registry.ids).toContain("Timer");
    expect(registry.schema("Timer")).toBe(props);
    expect(registry.resolve("COUNTDOWN")).toBe("Timer");
    expect(registry.resolve("stop-watch")).toBe("Timer");
  });
  it.each([
    [0, "0:00"],
    [59, "0:59"],
    [60, "1:00"],
    [3599, "59:59"],
    [3600, "1:00:00"],
    [3723, "1:02:03"],
    [86400, "24:00:00"],
  ] as const)("reads %s seconds as %s, with direction and controls", (seconds, time) => {
    for (const style of ["down", "up"] as const) {
      const value = { ...input, seconds, style };
      expect(meta.read(value, "filled")).toEqual([`${time} ${style}`, "Start", "Stop"]);
      const read = readComponent(components.Timer, value, "t1").join("\n");
      for (const text of [time, style, '"Activity"', "Start", "Stop", "[t1/start start]", "[t1/stop stop]"])
        expect(read).toContain(text);
      expect(meta.read(value, "loading")).toEqual([]);
    }
  });
});

function renderTimer(style: "down" | "up", seconds: number) {
  return renderInstance(
    "Timer",
    { ...input, style, seconds },
    "filled",
    { preset: "calm", mode: "light", accent: "moss" },
    { component: "t1" },
  );
}

describe.each(["down", "up"] as const)("Timer rendering in %s", (style) => {
  it.each([
    [0, "0:00"],
    [600, "10:00"],
    [1260, "21:00"],
    [86400, "24:00:00"],
  ] as const)("renders %s seconds and both addressed buttons", (seconds, time) => {
    const html = renderTimer(style, seconds);
    for (const part of meta.parts)
      expect(html.match(new RegExp(`data-testid="home/t1/${part}"`, "g"))).toHaveLength(1);
    expect(html).toContain(time);
    expect(html).toContain("tabular-nums");
    for (const part of ["start", "stop"] as const) {
      const tag = html.match(new RegExp(`<[^>]*data-testid="home/t1/${part}"[^>]*>`))?.[0];
      expect(tag).toContain('role="button"');
      expect(tag).toContain(`aria-label="${timerLabels[part]}"`);
    }
  });
});

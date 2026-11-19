import { describe, expect, expectTypeOf, it } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  readComponent,
  stampItemIds,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { elementAt, renderInstance } from "../../../../../test/render";
import { measurementLabels } from "../../copy";

const { props, meta, examples, fallback, probes } = components.Measurements;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;

describe("Measurements contract and boundaries", () => {
  it.each(examples)("accepts a domain example", (input) => {
    expect(props.safeParse(input).success).toBe(true);
  });
  it("defaults the range, trims text, and preserves bounded numeric readings", () => {
    expect(props.parse({ ...examples[0], label: "  Body weight  ", range: undefined })).toMatchObject({
      label: "Body weight",
      range: "month",
    });
    const maximum = {
      label: "a".repeat(20),
      unit: "a".repeat(8),
      points: Array(52).fill(10000),
      goal: 0,
      range: "year",
      goto: "a".repeat(64),
    };
    expect(props.safeParse(maximum).success).toBe(true);
    expect(props.safeParse({ ...maximum, points: [0, 0, 0, 0], goal: 10000 }).success).toBe(true);
    expectTypeOf<Props<typeof props, typeof meta>>().not.toBeAny();
  });
  it.each([
    {},
    { label: "" },
    { label: " " },
    { label: "a".repeat(21) },
    { unit: "" },
    { unit: "a".repeat(9) },
    { points: [] },
    { points: [1, 2, 3] },
    { points: Array(53).fill(1) },
    { points: [1, 2, 3, -1] },
    { points: [1, 2, 3, 10001] },
    { points: [1, 2, 3, NaN] },
    { points: [1, 2, 3, Infinity] },
    { goal: -1 },
    { goal: 10001 },
    { goal: NaN },
    { range: "week" },
    { goto: "Bad ID" },
    { goto: "a".repeat(65) },
    { color: "red" },
    { latest: 4 },
    { change: 4 },
    { id: "m1" },
  ])("rejects invalid fields and unknown keys", (patch) => {
    expect(props.safeParse(Object.keys(patch).length ? { ...examples[0], ...patch } : {}).success).toBe(
      false,
    );
  });
});

describe("Measurements fallback and probes", () => {
  const casts: CastLike[] = [
    { things: [], items: [] },
    {
      things: [{ type: "record", fields: ["title"] }],
      items: [{ id: "r1", type: "record", sample: true, title: "Morning" }],
    },
    { things: [], items: [{ id: "r1", type: "record", sample: true, title: 7 }] },
    {
      things: [{ type: "record", fields: ["title"] }],
      items: [{ id: "r1", type: "record", sample: false, title: "x".repeat(100) }],
    },
  ];
  it.each(casts)("validates a neutral, useful, malformed or long cast", (cast) => {
    expect(props.safeParse(fallback({ cast })).success).toBe(true);
  });
  it("uses shared placeholders or the cast, never fabricated health readings", () => {
    expect(fallback({ cast: casts[0]! })).toEqual({
      label: "Item one",
      unit: "0",
      points: [0, 0, 0, 0],
      goto: "details",
    });
    expect(fallback({ cast: casts[1]! }).label).toBe("Morning");
    expect(fallback({ cast: casts[3]! }).label).toHaveLength(20);
  });
  it("keeps the core-first near miss, actions, states, tier and registry contract", () => {
    expect(meta.status).toBe("ready");
    expect(meta.tier).toBe("phone");
    expect(meta.realPath).toContain("permission");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.pick).toContain("Sparkline");
    expect(meta.states).toEqual(["filled", "empty", "loading"]);
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Sparkline")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Measurements" });
    expect(probes.find((probe) => probe.kind === "read")).toMatchObject({
      expect: { address: "m1/add", action: "press" },
    });
    expect(
      createRegistry({ packs: ["health"], includeDrafts: true }).resolve("m-e-a-s-u-r-e-m-e-n-t-s"),
    ).toBe("Measurements");
    expect(createRegistry().ids).not.toContain("Measurements");
  });
});

describe("Measurements states, parts, reading and actions", () => {
  it.each(examples)("draws every required part and only the supplied goal", (input) => {
    const html = renderInstance("Measurements", input, "filled", theme, { component: "m1" });
    for (const part of meta.parts.filter((part) => part !== "goal" || "goal" in input))
      expect(elementAt(html, `home/m1/${part}`)).toBeDefined();
    if (!("goal" in input)) expect(html).not.toContain('data-testid="home/m1/goal"');
    expect(elementAt(html, "home/m1/range").attributes).toContain('role="radiogroup"');
    expect(elementAt(html, "home/m1/add").attributes).toContain('role="button"');
    expect(affordancesOf(meta, stampItemIds(meta, props.parse(input)), "m1")).toEqual([
      { address: "m1/range", part: "range", action: "select", detail: "" },
      { address: "m1/add", part: "add", action: "press", detail: `→${input.goto}` },
    ]);
    expect(readComponent(components.Measurements, input, "m1").join("\n")).toContain(measurementLabels.add);
  });
  it("computes readable latest, signed change and a zero goal without floating point noise", () => {
    expect(meta.read(props.parse(examples[0]), "filled")).toContain("-1.2 kg since first reading");
    expect(meta.read(props.parse({ ...examples[0], points: [0, 1, 2, 3], goal: 0 }), "filled")).toEqual(
      expect.arrayContaining(["3 kg", "+3 kg since first reading", "Goal 0 kg"]),
    );
    expect(meta.read(props.parse(examples[0]), "empty")).toEqual([]);
    expect(meta.read(props.parse(examples[0]), "loading")).toEqual([]);
  });
  it.each(["empty", "loading"] as const)("draws an intentional, inert %s state", (state) => {
    const html = renderInstance("Measurements", examples[0], state, theme);
    expect(html).not.toContain('role="button"');
    expect(html).not.toContain('role="radiogroup"');
    expect(readComponent(components.Measurements, examples[0], "m1", state)).toEqual([
      `m1 Measurements (${state})`,
    ]);
    if (state === "empty") {
      expect(html).toContain("Nothing here yet");
      expect(html).not.toContain("Body weight");
    } else {
      expect(html).toContain('aria-busy="true"');
      expect(html).toContain('aria-hidden="true"');
    }
  });
  it("selects repeated ranges through the real controller and links add to its screen", () => {
    const links: string[] = [];
    const controller = createScreenController({
      screen: { id: "home", components: [{ id: "m1", c: "Measurements", ...examples[0] }] },
      defs: components,
      onLink: (goto) => {
        links.push(goto);
      },
    });
    for (const value of ["3 months", "year", "Month", "quarter"]) {
      expect(controller.act({ address: "m1/range", action: "select", value }).ok).toBe(true);
      expect(controller.store.get("home/m1/range")).toBe(value);
      expect(controller.read()).toContain(`= "${value}"`);
    }
    expect(controller.press("m1/add").ok).toBe(true);
    expect(links).toEqual(["add_measurement"]);
    expect(controller.confirmation).toBeUndefined();
    controller.dispose();
  });
});

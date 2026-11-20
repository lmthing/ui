import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  packReady,
  placeholderTitle,
  planAct,
  readComponent,
  stampItemIds,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { addressedElements, renderInstance } from "../../../../../test/render";
import { pack } from "../..";

const { Clocks } = components;
const { meta, props, examples, fallback, probes } = Clocks;
const comparison = { places: examples.find((example) => example.arrange === "rows")!.places };
const home = comparison.places[0]!;
const inputWith = (patch: object) => ({ places: [{ ...home, ...patch }, comparison.places[1]] });
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const empty: CastLike = { things: [], items: [] };

describe("Clocks contract", () => {
  it.each(examples)("parses a domain example", (example) => {
    expect(props.safeParse(example).success).toBe(true);
  });

  it.each([
    {},
    { places: [] },
    { places: [home] },
    { places: Array(5).fill(home) },
    { ...comparison, color: "red" },
    { ...comparison, arrange: "strip" },
    { ...comparison, time: "12:00" },
    inputWith({ zone: "Mars/Base" }),
    inputWith({ label: " " }),
    inputWith({ label: "x".repeat(17) }),
    inputWith({ id: "r1" }),
    inputWith({ daylight: true }),
    inputWith({ offset: 0 }),
    inputWith({ time: "12:00" }),
  ])("rejects invalid or code-owned wire data", (input) => {
    expect(props.safeParse(input).success).toBe(false);
  });

  it("accepts exact bounds, trims text, and stamps validator-owned ids only for rendering", () => {
    const input = { places: Array(4).fill({ ...home, label: ` ${"x".repeat(16)} ` }) };
    expectTypeOf<Props<typeof props, typeof meta>["places"][number]["id"]>().toEqualTypeOf<string>();
    const parsed = props.parse(input);
    expect(parsed.density).toBeUndefined();
    expect(parsed).toMatchObject({ surface: "card", arrange: "grid" });
    expect(stampItemIds(meta, parsed).places[3]).toMatchObject({ id: "r4", label: "x".repeat(16) });
  });

  it("preserves pack gating, scope, and the model probes", () => {
    expect(createRegistry({ packs: [pack.id] }).ids.includes(meta.id)).toBe(packReady(pack.id));
    expect(meta.tier).toBe("phone");
    expect(meta.states).toEqual(["filled"]);
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "Clocks" }),
        expect.objectContaining({ kind: "choose", expect: "Timer" }),
        expect.objectContaining({ kind: "write", expect: "Clocks" }),
        expect.objectContaining({ kind: "write", variant: { axis: "arrange", value: "rows" } }),
      ]),
    );
  });
});

describe("Clocks fallback", () => {
  it("uses cast titles, filling unused slots with neutral placeholders", () => {
    const relevant: CastLike = {
      things: [{ type: "place", fields: ["name"] }],
      items: [{ id: "edinburgh", type: "place", name: "Edinburgh", sample: true }],
    };
    const malformed: CastLike = {
      things: [],
      items: [{ id: "bad", type: "place", name: 4, sample: true }],
    };
    for (const cast of [empty, relevant, malformed])
      expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: empty }).places).toEqual(
      [0, 1].map((index) => ({ label: placeholderTitle(index), zone: "Etc/UTC" })),
    );
    expect(fallback({ cast: relevant }).places.map(({ label }) => label)).toEqual([
      "Edinburgh",
      placeholderTitle(1),
    ]);
    expect(fallback({ cast: malformed })).toEqual(fallback({ cast: empty }));
  });
});

describe("Clocks parts and read/act", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-01-01T12:05:00Z"));
  });
  afterEach(() => vi.useRealTimers());
  const draw = (axes: object = {}) =>
    addressedElements(renderInstance("Clocks", { ...comparison, ...axes }, "filled", theme));

  it("draws each labeled clock, offset and day/night icon with stable addresses", () => {
    const parts = draw();
    expect([...parts.keys()]).toEqual([
      "home/c1/root",
      ...[1, 2].flatMap((index) =>
        ["root", "label", "time", "daylight", "offset"].map((part) => `home/c1/r${index}/${part}`),
      ),
    ]);
    for (const [index, label, time, offset, daylight] of [
      [1, "London", "12:05", "Home", "Daytime"],
      [2, "Tokyo", "21:05", "+9 h", "Nighttime"],
    ]) {
      const address = `home/c1/r${index}`;
      expect(parts.get(`${address}/label`)?.text).toContain(label);
      expect(parts.get(`${address}/time`)?.text).toContain(time);
      expect(parts.get(`${address}/offset`)?.text).toContain(offset);
      expect(parts.get(`${address}/root`)?.attributes).toContain(`${label}: ${time}, ${offset}, ${daylight}`);
    }
  });

  it("retains addresses in every finish and arrangement", () => {
    const baseline = [...draw().keys()].sort();
    for (const [axis, values] of Object.entries(meta.variants))
      for (const value of values) expect([...draw({ [axis]: value }).keys()].sort()).toEqual(baseline);
  });

  it("reads the displayed clocks without offering actions on their parts", () => {
    const reading = readComponent(Clocks, comparison, "c1").join("\n");
    expect(reading).toContain('"London": 12:05, Home, Daytime');
    expect(reading).toContain('"Tokyo": 21:05, +9 h, Nighttime');
    expect(affordancesOf(meta, stampItemIds(meta, props.parse(comparison)), "c1")).toEqual([]);
    const screen = { id: "home", components: [{ id: "c1", c: "Clocks", ...comparison }] };
    expect(planAct(screen, { Clocks }, {}, [{ address: "c1/r1/time", action: "press" }])).toMatchObject({
      ok: false,
      code: "not_actionable",
    });
  });
});

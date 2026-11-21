import {
  components,
  createRegistry,
  packReady,
  planAct,
  readScreen,
  type CastLike,
  type StateName,
} from "@lmthing/ui/catalog";
import { renderers } from "@lmthing/ui/kit";
import { describe, expect, it } from "vitest";
import { addressedElements, renderInstance } from "../../../../../test/render";
import { visibleTexts } from "../../../../../test/variants";

const def = components.Heatmap;
const { meta, props, fallback, examples, probes } = def;
const [weeks, hours] = [examples[0]!, examples[1]!];
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const matrix = (rows: number, columns: number, value = 0) =>
  Array.from({ length: rows }, () => Array<number>(columns).fill(value));
const screen = (input: object = weeks, state: StateName = "filled") => ({
  id: "home",
  components: [{ ...input, id: "s1", c: "Heatmap", state }],
});
const defs = { Heatmap: def };
const hasRenderer = Object.hasOwn(renderers, "Heatmap");
const maxWeeks = { title: "x".repeat(32), unit: "x".repeat(8), weeks: matrix(26, 7, -1.25) };
const addresses = (input: object, state: StateName = "filled") =>
  addressedElements(renderInstance("Heatmap", input, state, theme));

describe("Heatmap contract and boundaries", () => {
  it.each(examples)("accepts a domain example", (example) => {
    expect(props.safeParse(example).success).toBe(true);
  });

  it.each([
    { title: "" },
    { title: "x".repeat(33) },
    { unit: " ".repeat(4) },
    { unit: "x".repeat(9) },
    { style: "year" },
    { density: "large" },
    { detail: "none" },
    { emphasis: "loud" },
    { color: "red" },
    { cells: [] },
    { weeks: undefined },
    { weeks: matrix(3, 7) },
    { weeks: matrix(27, 7) },
    { weeks: matrix(4, 6) },
    { weeks: matrix(4, 8) },
    { weeks: matrix(4, 7, Infinity) },
    { style: "hours" },
    { days: matrix(7, 12) },
  ])("rejects an invalid weeks input %j", (patch) => {
    expect(props.safeParse({ ...weeks, ...patch }).success).toBe(false);
  });

  it.each([undefined, matrix(6, 12), matrix(8, 12), matrix(7, 11), matrix(7, 13), matrix(7, 12, NaN)])(
    "rejects a wrong hours matrix",
    (days) => expect(props.safeParse({ ...hours, days }).success).toBe(false),
  );

  it("keeps the default week layout and accepts the exact maximum", () => {
    expect(props.parse(maxWeeks)).toMatchObject({ style: "weeks", detail: "full", emphasis: "normal" });
    expect(createRegistry({ packs: ["data"] }).ids.includes("Heatmap")).toBe(packReady("data"));
  });
});

describe("Heatmap fallback and probes", () => {
  it("uses a cast title, and neutral placeholders for an empty or malformed cast", () => {
    const empty: CastLike = { things: [], items: [] };
    const cast: CastLike = {
      things: [{ type: "plant", fields: ["name"] }],
      items: [{ id: "fern", type: "plant", sample: true, name: "Fern" }],
    };
    const malformed: CastLike = { ...cast, items: [{ ...cast.items[0]!, name: 4 }] };
    for (const source of [empty, cast, malformed])
      expect(props.safeParse(fallback({ cast: source })).success).toBe(true);
    expect(fallback({ cast: empty })).toEqual({ title: "Item one", unit: "Item two", weeks: matrix(4, 7) });
    expect(fallback({ cast })).toMatchObject({ title: "Fern" });
    expect(fallback({ cast: malformed })).toEqual(fallback({ cast: empty }));
  });

  it("preserves the Calendar month near miss, tier and phone-only passive contract", () => {
    expect(meta).toMatchObject({ tier: "phone", weight: 2, states: ["filled", "loading"] });
    expect(meta).not.toHaveProperty("actions");
    expect(meta).not.toHaveProperty("confirmParts");
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "Heatmap" }),
        expect.objectContaining({ kind: "choose", expect: "Calendar" }),
        expect.objectContaining({ kind: "write", expect: "Heatmap" }),
        expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
      ]),
    );
  });
});

// The gallery and renderer map expose this view once the model and visual gates are unblocked.
describe.skipIf(!hasRenderer)("Heatmap states and parts", () => {
  it("draws all 182 static cell roots at the maximum", () => {
    const parts = addresses(maxWeeks);
    for (let i = 1; i <= 182; i++) expect(parts.has(`home/c1/r${i}/root`)).toBe(true);
    expect(parts.get("home/c1/r182/root")?.attributes).toContain(
      'aria-label="Sunday, Week 26: -1.25 xxxxxxxx"',
    );
  });

  it("draws the week/day and day/hour grids with a shared legend", () => {
    const weekly = addresses(weeks);
    for (const part of meta.parts) expect(weekly.has(`home/c1/${part}`)).toBe(true);
    expect(weekly.get("home/c1/legend")?.text).toEqual(["Intensity scale · checks"]);
    const hourly = addresses(hours);
    expect(hourly.get("home/c1/r84/root")?.attributes).toContain('aria-label="Sunday, 22:00: 0 walks"');
    const brief = addresses({ ...weeks, detail: "brief" });
    expect([...brief.keys()]).toEqual([...weekly.keys()].filter((address) => address !== "home/c1/detail"));
  });

  it.each(examples)("keeps loading inert without leaking titles or values", (example) => {
    const html = renderInstance("Heatmap", example, "loading", theme);
    expect([...addressedElements(html).keys()]).toEqual(["home/c1/root", "home/c1/grid"]);
    expect(html).toContain('aria-busy="true"');
    expect(visibleTexts(html)).toEqual([]);
  });
});

describe("Heatmap read and act", () => {
  it("reads the localized scale and matrix with their axis headings", () => {
    const weekly = readScreen(screen(), defs);
    expect(weekly).toContain("W1 · W2 · W3 · W4");
    expect(weekly).toContain("Monday: 1 · 3 · 1 · 2");
    expect(weekly).toContain("Intensity scale · checks: 0 · 2.5 · 5");
    const hourly = readScreen(screen({ ...hours, detail: "brief" }), defs);
    expect(hourly).toContain("00h · 02h");
    expect(hourly).toContain("Sunday: 0 · 0 · 0 · 1 · 4 · 4 · 3 · 2 · 1 · 0 · 0 · 0");
    expect(hourly).not.toContain("Two-hour blocks");
    expect(readScreen(screen(weeks, "loading"), defs)).not.toContain("Intensity scale");
  });

  it.each(["filled", "loading"] as const)("does not offer or plan actions when %s", (state) => {
    const input = screen(weeks, state);
    const reading = readScreen(input, defs);
    expect(reading).not.toMatch(/\[s1/);
    expect(planAct(input, defs, {}, [{ address: "s1/r1", action: "press" }])).toMatchObject({
      ok: false,
      code: "not_actionable",
    });
  });
});

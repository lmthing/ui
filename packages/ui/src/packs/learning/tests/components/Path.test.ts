import { describe, expect, expectTypeOf, it } from "vitest";
import {
  components,
  createRegistry,
  loadingLabel,
  packReady,
  placeholderTitle,
  planAct,
  readComponent,
  type CastLike,
  type Props,
  type StateName,
} from "@lmthing/ui/catalog";
import { addressedElements, renderInstance } from "../../../../../test/render";
import { pack } from "../..";

const { Path } = components;
const { meta, props, examples, fallback, probes } = Path;
const first = examples[0]!;
const done = first.units[0]!;
const withUnit = (patch: object) => ({ units: [{ ...done, ...patch }, ...first.units.slice(1)] });
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;

describe("Path schema", () => {
  it.each(examples)("accepts a domain example", (example) => {
    expect(props.safeParse(example).success).toBe(true);
  });
  it.each([
    {},
    { units: [done, done] },
    { units: Array(13).fill(done) },
    { ...first, milestones: [3] },
    { ...first, milestones: [1, 1] },
    { ...first, milestones: [-1] },
    { ...first, milestones: [0.5] },
    { ...first, milestones: Array(13).fill(0) },
    { ...first, density: "huge" },
    { ...first, surface: "tinted" },
    { ...first, detail: "none" },
    { ...first, style: "grid" },
    { ...first, color: "red" },
    withUnit({ title: "  " }),
    withUnit({ title: "x".repeat(25) }),
    withUnit({ state: "current" }),
    withUnit({ state: "open" }),
    withUnit({ goto: "Bad ID" }),
    withUnit({ goto: "a".repeat(65) }),
    withUnit({ goto: undefined }),
    withUnit({ icon: "unknown" }),
    withUnit({ id: "r1" }),
    withUnit({ unlocked: true }),
  ])("rejects invalid or code-owned input", (input) => {
    expect(props.safeParse(input).success).toBe(false);
  });
  it("accepts exact limits, applies defaults and reserves ids for the view", () => {
    const units = Array(12).fill({ ...done, title: ` ${"a".repeat(24)} `, goto: "a".repeat(64) });
    const milestones = units.map((_, index) => index);
    expect(props.parse({ units, milestones })).toMatchObject({
      detail: "full",
      style: "winding",
      milestones,
    });
    expect(props.parse({ units }).units[11]?.title).toBe("a".repeat(24));
    expectTypeOf<Props<typeof props, typeof meta>["units"][number]["id"]>().toEqualTypeOf<string>();
  });
});

describe("Path fallback and metadata", () => {
  it("fills from the cast and uses neutral placeholders for missing or malformed data", () => {
    const empty: CastLike = { things: [], items: [] };
    const cast: CastLike = {
      things: [{ type: "unit", fields: ["name"] }],
      items: [{ id: "unit", type: "unit", sample: true, name: "Map reading" }],
    };
    const malformed: CastLike = { ...cast, items: [{ ...cast.items[0]!, name: 3 }] };
    for (const sample of [empty, cast, malformed]) {
      const result = fallback({ cast: sample });
      expect(props.safeParse(result).success).toBe(true);
      expect(result.units.map(({ state }) => state)).toEqual(["current", "locked", "locked"]);
    }
    expect(fallback({ cast: empty }).units.map(({ title }) => title)).toEqual(
      [0, 1, 2].map((index) => placeholderTitle(index)),
    );
    expect(fallback({ cast }).units[0]?.title).toBe("Map reading");
    expect(fallback({ cast: malformed }).units[0]?.title).toBe(placeholderTitle(0));
    expect(fallback({ cast: { ...cast, items: Array(8).fill(cast.items[0]) } }).units).toHaveLength(6);
  });
  it("preserves the core-first probe, part tier and pack readiness gate", () => {
    expect(meta.tier).toBe("phone");
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(createRegistry({ packs: [pack.id] }).ids.includes(meta.id)).toBe(packReady(pack.id));
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "Path" }),
        expect.objectContaining({ kind: "choose", expect: "Steps" }),
        expect.objectContaining({ kind: "write", expect: "Path" }),
        expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
        expect.objectContaining({ kind: "read", expect: { address: "p1/r2", action: "press" } }),
      ]),
    );
  });
});

describe("Path states and parts", () => {
  it("draws only the declared conditional parts and keeps the same item roots", () => {
    for (const detail of ["full", "brief"] as const) {
      const addresses = addressedElements(renderInstance("Path", { ...first, detail }, "filled", theme));
      expect([...addresses.keys()].sort()).toEqual(
        [
          "home/c1/root",
          ...first.units.flatMap((_, index) =>
            [
              "root",
              "title",
              "icon",
              ...(detail === "full" ? ["state"] : []),
              ...(index === 2 ? ["milestone"] : []),
            ].map((part) => `home/c1/r${index + 1}/${part}`),
          ),
        ].sort(),
      );
      expect(addresses.get("home/c1/r2/root")?.attributes).toContain('aria-current="step"');
      expect(addresses.get("home/c1/r3/root")?.attributes).toContain('aria-disabled="true"');
    }
  });
  it("draws an inert loading state without showing or addressing units", () => {
    const html = renderInstance("Path", first, "loading", theme);
    expect(html).toContain(loadingLabel);
    expect(html).toContain('aria-busy="true"');
    expect([...addressedElements(html).keys()]).toEqual(["home/c1/root"]);
    expect(html).not.toContain('role="button"');
    expect(html).not.toContain(done.title);
  });
});

describe("Path read and act", () => {
  it.each(["full", "brief"] as const)("reads statuses and navigation for %s detail", (detail) => {
    const text = readComponent(Path, { ...first, detail }, "p1").join("\n");
    expect(text).toContain("Fern quiz");
    expect(text).toContain("Badge");
    expect(text).toContain("[p1/r1 press");
    expect(text).toContain("[p1/r2 press");
    expect(text).not.toContain("[p1/r3 press");
    if (detail === "full") expect(text).toContain("Check the soil · Start unit");
    else expect(text).not.toContain("Start unit");
  });
  it("navigates only from done and current roots, never locked or loading ones", () => {
    const press = (address: string, state: StateName = "filled") =>
      planAct(
        { id: "home", components: [{ ...first, id: "p1", c: "Path", state }] },
        { Path },
        {},
        [{ address, action: "press" }],
        null,
      );
    expect(press("p1/r1")).toMatchObject({ ok: true, links: [{ address: "home/p1/r1", goto: "light" }] });
    expect(press("p1/r2")).toMatchObject({ ok: true, links: [{ address: "home/p1/r2", goto: "soil" }] });
    for (const address of ["p1", "p1/r3", "p1/r2/title", "p1/r3/milestone"]) {
      expect(press(address)).toMatchObject({ ok: false, code: "not_actionable" });
    }
    expect(press("p1/r2", "loading")).toMatchObject({ ok: false, code: "not_actionable" });
    expect(readComponent(Path, first, "p1", "loading")).toEqual(["p1 Path (loading)"]);
  });
});

it("renders modules as rows with the original addresses and gates", () => {
  const input = { ...first, style: "modules" };
  const parts = (style: string, detail: string) =>
    addressedElements(renderInstance("Path", { ...input, style, detail }, "filled", theme));
  for (const detail of ["full", "brief"]) {
    const rows = parts("modules", detail);
    expect([...rows.keys()].sort()).toEqual([...parts("winding", detail).keys()].sort());
    expect(rows.get("home/c1/r1/root")?.attributes).toContain('role="link"');
    expect(rows.get("home/c1/r2/root")?.attributes).toContain('aria-current="true"');
    expect(rows.get("home/c1/r3/root")?.attributes).not.toContain('role="link"');
  }
  const loading = renderInstance("Path", input, "loading", theme);
  expect([...addressedElements(loading).keys()]).toEqual(["home/c1/root"]);
  expect(loading).toContain('aria-busy="true"');
  expect(loading).not.toContain('role="link"');
  const read = readComponent(Path, input, "p1").join("\n");
  expect(read).toContain("[p1/r2 press");
  expect(read).not.toContain("[p1/r3 press");
});

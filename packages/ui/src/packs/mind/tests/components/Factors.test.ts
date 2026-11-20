import { describe, expect, expectTypeOf, it } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  packReady,
  placeholderTitle,
  planAct,
  readScreen,
  stampItemIds,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { addressedElements, elementAt, renderInstance } from "../../../../../test/render";

const def = components.Factors;
const { props, meta, examples, fallback, probes } = def;
const sample = examples[0]!;
const tile = sample.items[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const screen = { id: "home", components: [{ id: "f1", c: "Factors", ...sample }] };
const defs = { Factors: def };

describe("Factors schema and boundaries", () => {
  it.each(examples)("accepts a domain example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );

  it.each([4, 16])("accepts %i tiles with up to 14 trimmed characters", (count) => {
    const label = "x".repeat(14);
    const parsed = props.parse({ items: Array(count).fill({ ...tile, label: ` ${label} ` }) });
    expect(parsed).toMatchObject({ surface: "card" });
    expect(parsed.items).toEqual(Array(count).fill({ ...tile, label }));
  });

  it.each([
    {},
    { items: Array(3).fill(tile) },
    { items: Array(17).fill(tile) },
    { items: Array(4).fill({ ...tile, label: " " }) },
    { items: Array(4).fill({ ...tile, label: "x".repeat(15) }) },
    { items: Array(4).fill({ ...tile, icon: "unknown" }) },
    { items: Array(4).fill({ ...tile, icon: undefined }) },
    { items: Array(4).fill({ ...tile, on: "true" }) },
    { items: Array(4).fill({ ...tile, on: undefined }) },
    { items: Array(4).fill({ ...tile, id: "r1" }) },
    { items: Array(4).fill({ ...tile, color: "red" }) },
    { items: sample.items, density: "tiny" },
    { items: sample.items, surface: "plain" },
    { items: sample.items, columns: 3 },
  ])("rejects invalid input", (input) => expect(props.safeParse(input).success).toBe(false));

  it("gives factor tiles validator IDs only in view props", () => {
    type ViewProps = Props<typeof props, typeof meta>;
    expectTypeOf<ViewProps["items"][number]["id"]>().toEqualTypeOf<string>();
    expectTypeOf<ViewProps>().not.toBeAny();
  });
});

describe("Factors fallback and contract", () => {
  const empty: CastLike = { things: [], items: [] };
  const matching: CastLike = {
    things: [{ type: "record", fields: ["first"] }],
    items: [{ id: "sample", type: "record", sample: true, first: "A very long placeholder title" }],
  };
  const malformed: CastLike = { ...matching, items: [{ ...matching.items[0]!, first: 7 }] };

  it("clips matching cast labels and fills missing labels with neutral unselected tiles", () => {
    for (const cast of [empty, matching, malformed]) {
      expect(props.safeParse(fallback({ cast })).success).toBe(true);
    }
    expect(fallback({ cast: matching }).items[0]).toEqual({
      label: "A very long",
      icon: "tag",
      on: false,
    });
    const neutral = [0, 1, 2, 3].map((i) => ({ label: placeholderTitle(i), icon: "tag", on: false }));
    expect(fallback({ cast: empty }).items).toEqual(neutral);
    expect(fallback({ cast: malformed }).items).toEqual(neutral);
  });

  it("includes Factors in a live registry exactly when mind is ready", () => {
    expect(createRegistry({ packs: ["mind"] }).ids.includes("Factors")).toBe(packReady("mind"));
    expect(createRegistry({ packs: ["mind"], includeDrafts: true }).schema("Factors")).toBe(props);
  });

  it("has the dense local contract and core-first probes", () => {
    expect(meta).toMatchObject({ states: ["filled"], dense: true, weight: 3, tier: "phone" });
    expect(meta).not.toHaveProperty("confirmParts");
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(probes.filter((probe) => probe.kind === "choose").map(({ expect }) => expect)).toEqual([
      "Factors",
      "Chips",
    ]);
    expect(probes).toContainEqual(expect.objectContaining({ kind: "write", expect: "Factors" }));
    expect(probes).toContainEqual(
      expect.objectContaining({
        kind: "read",
        screen: 0,
        expect: { address: "f1/r2", action: "toggle" },
      }),
    );
  });
});

describe("Factors state and parts", () => {
  it.each(examples)("draws all addressed tile parts and exposes every pressed flag", (input) => {
    const html = renderInstance("Factors", input, "filled", theme, { component: "f1" });
    const base = "home/f1";
    expect([...addressedElements(html).keys()]).toEqual([
      `${base}/root`,
      ...input.items.flatMap((_, i) => ["root", "icon", "label"].map((part) => `${base}/r${i + 1}/${part}`)),
    ]);
    input.items.forEach(({ label, on }, i) => {
      const { attributes } = elementAt(html, `${base}/r${i + 1}/root`);
      expect(attributes).toContain('role="button"');
      expect(attributes).toContain(`aria-label="${label}"`);
      expect(attributes).toContain(`aria-pressed="${on}"`);
    });
  });
});

describe("Factors read and act", () => {
  it("offers only toggles at tile roots and reads their initial selection", () => {
    const stamped = stampItemIds(meta, props.parse(sample));
    const reading = readScreen(screen, defs);
    expect(affordancesOf(meta, stamped, "f1")).toEqual(
      sample.items.map(({ on }, i) => ({
        address: `f1/r${i + 1}`,
        action: "toggle",
        part: "root",
        detail: on ? ":on" : ":off",
      })),
    );
    expect(reading).toContain('"Slept well" [f1/r1 toggle:on]');
    expect(reading).toContain('"Outdoors" [f1/r2 toggle:off]');
  });

  it("toggles selected and unselected tiles independently, including repeated taps", () => {
    const toggle = (i: number) => ({ address: `home/f1/r${i}/root`, action: "toggle" });
    const next = planAct(screen, defs, {}, [toggle(1), toggle(2)]);
    expect(next).toMatchObject({
      ok: true,
      values: { "home/f1/r1": false, "home/f1/r2": true },
      links: [],
    });
    if (!next.ok) return;
    const read = readScreen(screen, defs, next.values);
    expect(read).toContain('"Slept well" [f1/r1 toggle:off]');
    expect(read).toContain('"Outdoors" [f1/r2 toggle:on]');
    expect(read).toContain('"Friends" [f1/r3 toggle:on]');
    expect(planAct(screen, defs, next.values, [toggle(2)])).toMatchObject({
      ok: true,
      values: { "home/f1/r1": false, "home/f1/r2": false },
    });
  });

  it.each([
    { address: "f1", action: "toggle" },
    { address: "f1/r1/icon", action: "toggle" },
    { address: "f1/r1/label", action: "toggle" },
    { address: "f1/r1", action: "select" },
    { address: "f1/r1", action: "delete" },
    { address: "f1/r17", action: "toggle" },
  ])("rejects unsupported actions: $address $action", (step) => {
    expect(planAct(screen, defs, {}, [step])).toMatchObject({ ok: false, code: "not_actionable" });
  });
});

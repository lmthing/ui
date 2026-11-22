import { describe, expect, expectTypeOf, it } from "vitest";
import {
  components,
  createRegistry,
  emptyLine,
  packReady,
  pickerKey,
  placeholderTitle,
  planAct,
  readScreen,
  type CastLike,
  type Props,
  type StateName,
} from "@lmthing/ui/catalog";
import { addressedElements, renderInstance } from "../../../../../test/render";
import { pack } from "../..";

const { Seating } = components;
const { props, meta, examples, fallback, probes } = Seating;
type Input = ReturnType<typeof fallback>;
const example: Input = examples[0]!;
const [oak, birch] = example.tables;
const defs = { Seating };
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const render = (input: Input, state: StateName = "filled") =>
  renderInstance("Seating", input, state, theme, { component: "s1", thing: "table" });
const screen = (input: Input, state: StateName = "filled") => ({
  id: "home",
  components: [{ ...input, id: "s1", c: "Seating", state }],
});
const press = (id: number) => ({ address: `s1/r${id}`, action: "press" });
const move = (id: number, value: string) => ({ address: `s1/r${id}`, action: "move", value });

describe("Seating schema", () => {
  it.each(examples)("accepts the examples", (input) => expect(props.safeParse(input).success).toBe(true));
  it("trims text and stamps entries only at runtime", () => {
    const parsed = props.parse({ tables: [{ ...oak!, label: " Oak " }], unseated: [" Deepa Shah "] });
    expect(parsed).toMatchObject({
      detail: "full",
      entries: [
        { kind: "table", label: "Oak" },
        { kind: "guest", at: 0 },
        { kind: "guest", at: 0 },
        { kind: "guest", name: "Deepa Shah", at: null },
      ],
    });
    expect(parsed.entries.every((row) => !("id" in row))).toBe(true);
    expectTypeOf<Props<typeof props, typeof meta>["entries"][number]["id"]>().toEqualTypeOf<string>();
  });
  // prettier-ignore
  it.each([
    { tables: [] }, { tables: Array(21).fill(oak) }, { tables: [oak, { ...birch, label: " Oak " }] },
    { unseated: Array(21).fill("Guest") }, { unseated: [" "] }, { unseated: ["x".repeat(25)] },
    { color: "red" }, { entries: [] }, { density: "compact" }, { surface: "card" }, { detail: "hidden" },
  ])("rejects invalid input %o", (input) => expect(props.safeParse({ ...example, ...input }).success).toBe(false));
  // prettier-ignore
  it.each([
    { seats: 1 }, { seats: 17 }, { seats: 2.5 }, { seats: 2, guests: ["One", "Two", "Three"] },
    { shape: "square" }, { label: "x".repeat(13) }, { label: " " }, { guests: ["x".repeat(25)] },
    { id: "r1" }, { pixels: 12 },
  ])("rejects invalid table %o", (table) =>
    expect(props.safeParse({ ...example, tables: [{ ...oak, ...table }] }).success).toBe(false));
  it("accepts the exact dense limits", () => {
    const name = "x".repeat(24);
    const tables = Array.from({ length: 20 }, (_, i) => ({
      label: `${"x".repeat(10)}${i.toString().padStart(2, "0")}`,
      seats: 16,
      shape: "round",
      guests: Array(16).fill(name),
    }));
    expect(props.parse({ tables, unseated: Array(20).fill(name) }).entries).toHaveLength(360);
  });
});

describe("Seating fallback and contract", () => {
  it("uses cast names and falls back to neutral placeholders for empty or malformed casts", () => {
    const cast: CastLike = {
      things: [{ type: "guest", fields: ["label"] }],
      items: [{ id: "g", type: "guest", label: "  Jun Park  ", sample: true }],
    };
    const empty: CastLike = { things: [], items: [] };
    const bad: CastLike = { ...cast, items: [{ ...cast.items[0]!, label: 21 }] };
    for (const input of [cast, empty, bad])
      expect(props.safeParse(fallback({ cast: input })).success).toBe(true);
    expect(fallback({ cast }).unseated).toEqual(["Jun Park"]);
    expect(fallback({ cast: empty }).unseated[0]).toBe(placeholderTitle(0));
  });
  it("retains its core-first near miss, tier, probes and pack readiness gate", () => {
    expect(meta).toMatchObject({ status: "ready", tier: "phone", dense: true });
    for (const [kind, expectValue] of [
      ["choose", "Seating"],
      ["choose", "MapPins"],
      ["write", "Seating"],
    ])
      expect(probes).toContainEqual(expect.objectContaining({ kind, expect: expectValue }));
    expect(probes).toContainEqual(
      expect.objectContaining({ kind: "read", expect: { address: "s1/r5", action: "move" } }),
    );
    expect(createRegistry({ packs: [pack.id] }).ids.includes("Seating")).toBe(packReady(pack.id));
  });
});

describe("Seating states and parts", () => {
  it("draws occupied and free seats, addressed tables, a tray and the empty state", () => {
    const html = render(example);
    const addresses = addressedElements(html);
    for (const part of [
      "root",
      "map",
      "summary",
      "tray",
      "r1/root",
      "r2/root",
      "r3/root",
      "r4/root",
      "r5/root",
    ])
      expect(addresses.has(`home/s1/${part}`), part).toBe(true);
    expect(addresses.get("home/s1/r3/root")?.attributes).toContain('aria-label="Ruth Shah"');
    expect(html).toContain(">RS<");
    expect(html).toContain('aria-label="Free seat"');
    expect(render({ ...example, detail: "brief" })).not.toContain("home/s1/summary");
    expect(render(example, "empty")).toContain(emptyLine("table"));
    expect(render(example, "empty")).not.toContain("home/s1/map");
    expect(planAct(screen(example, "empty"), defs, {}, [press(1)], null)).toMatchObject({
      ok: false,
      code: "not_actionable",
    });
  });
});

describe("Seating read and act", () => {
  it("opens just the pressed table, then closes it on another press", () => {
    const first = planAct(screen(example), defs, {}, [press(1)], null);
    if (!first.ok) throw new Error(JSON.stringify(first));
    const key = `home/s1/${pickerKey}`;
    expect(first.values[key]).toBe("r1");
    const second = planAct(screen(example), defs, first.values, [press(2)], null);
    if (!second.ok) throw new Error(JSON.stringify(second));
    expect(second.values[key]).toBe("r2");
    const close = planAct(screen(example), defs, second.values, [press(2)], null);
    expect(close).toMatchObject({ ok: true, values: { [key]: undefined } });
    expect(planAct(screen(example), defs, {}, [press(3)], null)).toMatchObject({
      ok: false,
      code: "not_actionable",
    });
  });
  it("moves by stable address and recomputes the displayed counts and choices", () => {
    const input = {
      ...example,
      tables: [
        { ...oak!, seats: 2 },
        { ...birch!, seats: 2 },
      ],
    };
    const seating = screen(input);
    expect(readScreen(seating, defs)).toContain('[s1/r5 move = null; choices ["Birch"]]');
    for (const label of ["Oak", "Unknown"])
      expect(planAct(seating, defs, {}, [move(5, label)], null)).toMatchObject({
        ok: false,
        code: "invalid_value",
      });
    const result = planAct(seating, defs, {}, [move(5, "Birch"), move(3, "Birch"), move(5, "Oak")], null);
    if (!result.ok) throw new Error(JSON.stringify(result));
    const reading = readScreen(seating, defs, result.values);
    expect(reading).toContain("r5: Deepa Shah (Oak)");
    expect(reading).toContain("r3: Ruth Shah (Birch)");
    expect(reading).toContain("3 of 4 seats filled");
    expect(reading).toContain("Unseated · 0");
    expect(reading).not.toContain("[s1/r3 move");
    expect(input.unseated).toEqual(["Deepa Shah"]);
  });
});

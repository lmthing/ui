import {
  components,
  createRegistry,
  packReady,
  planAct,
  readScreen,
  stampItemIds,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { addressedElements, renderInstance } from "../../../../../test/render";

const def = components.Board;
const { meta, props, examples, fallback, probes } = def;
const ledge = examples[0]!;
const trot = examples[1]!;
const defs = { Board: def };
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const screen = (input: object, state: "filled" | "empty" = "filled") => ({
  id: "home",
  components: [{ ...input, id: "s1", c: "Board", state }],
});
const move = (value?: unknown) => ({ address: "s1/r1", action: "move", value });

describe("Board contract and boundaries", () => {
  it.each(examples)("accepts a domain example", (example) => {
    expect(props.safeParse(example).success).toBe(true);
  });

  it.each([
    { columns: [{ label: "First" }] },
    { columns: Array.from({ length: 6 }, (_, i) => ({ label: `Stage ${i}` })) },
    { columns: [{ label: "Open" }, { label: " Open " }] },
    { columns: [{ label: "x".repeat(15) }, { label: "Done" }] },
    { columns: [{ label: "Waiting", count: 1 }, { label: "Done" }] },
    { cards: [] },
    { cards: Array.from({ length: 17 }, () => ledge.cards[0]) },
    ...[
      { title: " ".repeat(4) },
      { title: "x".repeat(33) },
      { column: -1 },
      { column: 1.5 },
      { column: 3 },
      { tag: "x".repeat(13) },
      { who: "x".repeat(17) },
      { goto: undefined },
      { goto: "Invalid Label" },
      { value: "9" },
      { value: Infinity },
      { id: "r1" },
    ].map((card) => ({ cards: [{ ...ledge.cards[0], ...card }] })),
    { arrange: "stack" },
    { color: "red" },
  ])("rejects invalid Board fields: %j", (change) => {
    expect(props.safeParse({ ...ledge, ...change }).success).toBe(false);
  });

  it("accepts exact bounds, trims labels and adds ids only after validation", () => {
    const columns = Array.from({ length: 5 }, (_, i) => ({ label: `${"x".repeat(13)}${i}` }));
    const card = {
      title: "x".repeat(32),
      column: 4,
      tag: "x".repeat(12),
      who: "x".repeat(16),
      goto: "detail",
    };
    const cards = Array.from({ length: 16 }, () => ({ ...card, title: ` ${card.title} ` }));
    const parsed = props.parse({ columns, cards });
    expect(parsed).toMatchObject({ arrange: "strip", surface: "plain" });
    expect(parsed.cards[15]).toEqual(card);
    expect(stampItemIds(meta, parsed).cards[15]).toEqual({ ...card, id: "r16" });
    expectTypeOf<Props<typeof props, typeof meta>["cards"][number]["id"]>().toEqualTypeOf<string>();
  });
});

describe("Board fallback and probes", () => {
  it("uses cast records and valid neutral placeholders without usable cast data", () => {
    const empty: CastLike = { things: [], items: [] };
    const cast: CastLike = {
      things: [{ type: "plant", fields: ["name"] }],
      items: [{ id: "fern", type: "plant", sample: true, name: "Fern" }],
    };
    const malformed: CastLike = { ...cast, items: [{ ...cast.items[0]!, name: 4 }] };
    for (const source of [empty, cast, malformed])
      expect(props.safeParse(fallback({ cast: source })).success).toBe(true);
    expect(fallback({ cast: empty })).toEqual({
      columns: [{ label: "Item one" }, { label: "Item two" }],
      cards: [{ title: "Item one", column: 0, goto: "detail" }],
    });
    expect(fallback({ cast }).cards[0]?.title).toBe("Fern");
    expect(fallback({ cast: malformed }).cards[0]?.title).toBe("Item one");
  });

  it("retains dense phone metadata, the core near miss and the variant and move probes", () => {
    expect(meta).toMatchObject({ tier: "phone", weight: 3, dense: true, states: ["filled", "empty"] });
    expect(createRegistry({ packs: ["data"] }).ids.includes("Board")).toBe(packReady("data"));
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "Board" }),
        expect.objectContaining({ kind: "choose", expect: "Checklist" }),
        expect.objectContaining({ kind: "write", expect: "Board" }),
        expect.objectContaining({ kind: "write", variant: { axis: "arrange", value: "rows" } }),
        expect.objectContaining({ kind: "read", expect: { address: "s1/r1", action: "move" } }),
      ]),
    );
  });
});

describe("Board states and parts", () => {
  it("draws each card once with its original id, optional detail, and labelled destinations", () => {
    const html = renderInstance("Board", ledge, "filled", theme);
    const parts = addressedElements(html);
    const at = (part: string) => parts.get(`home/c1/${part}`);
    expect(at("root")).toBeDefined();
    expect(at("columns")).toBeDefined();
    expect(html).toContain(">Waiting<");
    expect(at("r1/title")?.text).toContain("Boston fern");
    expect(at("r1/tag")?.text).toContain("Rootbound");
    expect(at("r1/who")?.text).toContain("Ana");
    expect(at("r2/root")).toBeDefined();
    expect(at("r2/tag")).toBeUndefined();
    expect(html.match(/data-testid="home\/c1\/r1\/root"/g)).toHaveLength(1);
    expect(html).toContain('aria-label="Move Boston fern to In care"');
    expect(html).not.toContain('aria-label="Move Boston fern to Waiting"');
    const valued = renderInstance("Board", trot, "filled", theme);
    expect(addressedElements(valued).get("home/c1/r1/value")?.text).toContainEqual(
      expect.stringContaining("70"),
    );
    expect(valued).toMatch(/>Total(?:<!-- -->)?\s*<[^>]+>\$70</);
  });

  it("draws only the neutral empty message when empty", () => {
    const parts = addressedElements(renderInstance("Board", ledge, "empty", theme));
    expect([...parts.keys()].sort()).toEqual(["home/c1/empty", "home/c1/root"]);
    expect(planAct(screen(ledge, "empty"), defs, {}, [move("In care")]).ok).toBe(false);
    expect(readScreen(screen(ledge, "empty"), defs)).not.toContain("Boston fern");
  });
});

describe("Board read and act", () => {
  it("moves repeatedly, recomputes stage counts and money, and keeps the original press target", () => {
    const onLink = vi.fn();
    const controller = createScreenController({ screen: screen(trot), defs, onLink, currency: "GBP" });
    try {
      expect(controller.read()).toContain("New (0) · Quoted (1, Total £70) · Booked (1, Total £18)");
      expect(controller.read()).toContain('[s1/r1 move = "Quoted"; choices ["New","Booked"]]');
      expect(controller.act([move("Booked"), move("Unknown")])).toMatchObject({ ok: false, at: 1 });
      expect(controller.snapshotScreen()).toEqual(screen(trot));
      expect(controller.act(move("Booked"))).toMatchObject({ ok: true });
      expect(controller.read()).toContain("New (0) · Quoted (0) · Booked (2, Total £88)");
      expect(controller.read()).toContain("r1: Booked · Milo's weekday walks · Recurring · Sam · £70");
      expect(controller.press("home/s1/r1")).toMatchObject({ ok: true });
      expect(onLink).toHaveBeenCalledExactlyOnceWith("milo", "home/s1/r1");
      expect(controller.act(move("New"))).toMatchObject({ ok: true });
      expect(controller.snapshotScreen().components[0]?.cards).toEqual([
        { ...trot.cards[0], column: 0 },
        trot.cards[1],
      ]);
    } finally {
      controller.dispose();
    }
  });

  it.each([undefined, "Waiting", "Unknown", 1])("rejects invalid destination %s", (value) => {
    expect(planAct(screen(ledge), defs, {}, [move(value)])).toMatchObject({
      ok: false,
      code: "invalid_value",
    });
  });
});

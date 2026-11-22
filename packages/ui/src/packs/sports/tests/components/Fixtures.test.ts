import { describe, expect, expectTypeOf, it } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  emptyLine,
  packReady,
  placeholderTitle,
  planAct,
  readComponent,
  stampItemIds,
  type CastLike,
  type Props,
  type StateName,
} from "@lmthing/ui/catalog";
import { addressedElements, renderInstance } from "../../../../../test/render";

const def = components.Fixtures;
const { meta, props, examples, fallback, probes } = def;
const list = examples[0]!;
const first = list.matches[0]!;
const next = examples[1]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const address = (part: string) => `home/f1/${part}`;
const render = (input: unknown, state: StateName = "filled") =>
  renderInstance("Fixtures", input, state, theme, { component: "f1" });

describe("Fixtures schema and bounds", () => {
  it.each(examples)("accepts each domain example", (input) =>
    expect(props.safeParse(input).success).toBe(true),
  );
  it("applies defaults, trims text and keeps ids out of the wire input", () => {
    type View = Props<typeof props, typeof meta>;
    expectTypeOf<View["matches"][number]["id"]>().toEqualTypeOf<string>();
    expect(props.parse({ matches: [{ ...first, opponent: "  Fern House " }] })).toMatchObject({
      style: "list",
      detail: "full",
      matches: [first],
    });
  });
  // prettier-ignore
  it.each([
    {}, { matches: [] }, { matches: Array(7).fill(first) }, { ...list, style: "grid" },
    { ...list, detail: "none" }, { ...list, density: "tiny" }, { ...list, color: "#000" },
  ])("rejects invalid component input %j", (input) => expect(props.safeParse(input).success).toBe(false));
  // prettier-ignore
  it.each([
    { opponent: " " }, { opponent: "a".repeat(25) }, { venue: "a".repeat(29) }, { kit: "a".repeat(17) },
    { date: "22/11/2026" }, { time: "24:00" }, { meet: "10:60" }, { goto: "Bad ID" },
    { goto: undefined }, { us: undefined }, { them: undefined }, { us: -1 }, { them: 1.5 },
    { id: "r1" }, { visible: true }, { result: "Win" },
  ])("rejects invalid match input %j", (patch) => {
    expect(props.safeParse({ matches: [{ ...first, ...patch }] }).success).toBe(false);
  });
  it("accepts exact maxima for the collection and text fields", () => {
    const match = { ...first, opponent: "a".repeat(24), venue: "b".repeat(28), kit: "c".repeat(16) };
    expect(props.safeParse({ style: "next", matches: Array(6).fill(match) }).success).toBe(true);
  });
});

describe("Fixtures fallback and metadata", () => {
  it("uses neutral placeholders and bounds cast titles", () => {
    const empty: CastLike = { things: [], items: [] };
    const thing = { type: "team", fields: ["name"] };
    const item = { id: "one", type: "team", sample: true, name: "Rovers" };
    const cast = { things: [thing], items: [item] };
    const malformed = { ...cast, items: [{ ...item, name: 10 }] };
    for (const candidate of [empty, cast, malformed])
      expect(props.safeParse(fallback({ cast: candidate })).success).toBe(true);
    expect(fallback({ cast: empty }).matches[0]?.opponent).toBe(placeholderTitle(0));
    expect(fallback({ cast }).matches[0]?.opponent).toBe("Rovers");
    expect(fallback({ cast: malformed }).matches[0]?.opponent).toBe(placeholderTitle(0));
    const items = Array.from({ length: 8 }, (_, i) => ({ ...item, id: `team_${i}`, name: "x".repeat(60) }));
    expect(fallback({ cast: { ...cast, items } }).matches.map(({ opponent }) => opponent)).toEqual(
      Array(3).fill("x".repeat(24)),
    );
  });
  it("preserves tiers, the pack gate and the core-first near miss", () => {
    expect(meta.tier).toBe("phone");
    expect(meta.partTiers).toEqual({ root: "people" });
    expect(meta.realPath).not.toBe("");
    expect(createRegistry({ packs: ["sports"] }).ids.includes("Fixtures")).toBe(packReady("sports"));
    expect(probes.filter(({ kind }) => kind === "choose").map(({ expect }) => expect)).toEqual([
      "Fixtures",
      "Calendar",
    ]);
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "write", expect: "Fixtures" }),
        expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
        expect.objectContaining({ kind: "read", expect: { address: "f1/r1", action: "press" } }),
      ]),
    );
  });
});

describe("Fixtures parts, states and reading", () => {
  it("renders addressed fixtures with badges, dates, sides, venues and optional results", () => {
    const html = render(list);
    const parts = addressedElements(html);
    expect(parts.has(address("root"))).toBe(true);
    expect(parts.get(address("r1/root"))?.attributes).toContain('role="link"');
    expect(parts.get(address("r1/badge"))?.attributes).toContain('aria-label="Fern House"');
    for (const part of ["opponent", "date", "time", "side", "score", "result"])
      expect(parts.has(address(`r1/${part}`))).toBe(true);
    expect(parts.get(address("r1/score"))?.text).toContain("3–1");
    expect(parts.has(address("r2/venue"))).toBe(true);
    for (const part of ["score", "result", "meet", "kit"])
      expect(parts.has(address(`r2/${part}`))).toBe(false);
    const read = readComponent(def, list, "f1").join("\n");
    expect(read).toContain("r1 · Fern House · FH · 15 Nov 2026 · 10:00 · Away · 3–1 · Win");
    expect(read).toContain("r2 · Garden Crew · GC · 22 Nov 2026 · 10:00 · Home · Ledge Park");
  });
  it("hides logistics by style and detail without losing original inputs or addresses", () => {
    const input = { ...next, matches: [...next.matches, first] };
    const full = addressedElements(render(input));
    const briefInput = { ...input, detail: "brief" };
    const brief = addressedElements(render(briefInput));
    const listParts = addressedElements(render({ ...input, style: "list" }));
    const removed = meta.variantParts["detail.brief"].hides.map((part) => address(`r1/${part}`));
    expect([...full.keys()].filter((key) => !brief.has(key)).sort()).toEqual([...removed].sort());
    expect([...brief.keys()].some((key) => key.startsWith(address("r2/")))).toBe(false);
    expect(listParts.has(address("r1/venue"))).toBe(true);
    expect(listParts.has(address("r1/meet"))).toBe(false);
    expect(listParts.has(address("r1/kit"))).toBe(false);
    expect(readComponent(def, input, "f1").join("\n")).toContain("Meet at 09:40 · Kit: Blue shirts");
    const reading = readComponent(def, briefInput, "f1").join("\n");
    for (const text of ["Trot Field", "09:40", "Blue shirts", first.opponent])
      expect(reading).not.toContain(text);
    expect(input.matches[0]).toMatchObject({ venue: "Trot Field", meet: "09:40", kit: "Blue shirts" });
  });
  it.each(["empty", "loading"] as const)("has an inert %s state", (state) => {
    for (const input of [list, next]) {
      const html = render(input, state);
      const parts = addressedElements(html);
      expect(parts.has(address("root"))).toBe(true);
      expect(parts.has(address("message"))).toBe(state === "empty");
      expect(parts.has(address("r1/root"))).toBe(false);
      expect(html).toContain(state === "empty" ? emptyLine() : "Loading");
      expect(html).not.toContain('role="link"');
      expect(readComponent(def, input, "f1", state).join("\n")).not.toContain("[f1/");
    }
  });
});

describe("Fixtures navigation", () => {
  it("presses only the visible fixture roots and does not edit data", () => {
    const matches = [...next.matches, first];
    const input = { ...next, matches };
    const act = (part: string, style: "list" | "next" | "scoreboard", state: StateName = "filled") =>
      planAct(
        { id: "home", components: [{ ...input, style, state, c: "Fixtures", id: "f1" }] },
        components,
        {},
        [{ address: address(part), action: "press" }],
      );
    expect(affordancesOf(meta, stampItemIds(meta, props.parse(input)), "f1")).toEqual([
      { address: "f1/r1", part: "root", action: "press", detail: "→river_match" },
    ]);
    expect(act("r1/root", "next")).toMatchObject({
      ok: true,
      values: {},
      links: [{ address: address("r1"), goto: "river_match" }],
    });
    expect(act("r2/root", "list")).toMatchObject({
      ok: true,
      links: [{ address: address("r2"), goto: "fern_match" }],
    });
    expect(act("r2/root", "next")).toMatchObject({ ok: false });
    expect(act("r2/root", "scoreboard")).toMatchObject({
      ok: true,
      links: [{ address: address("r2"), goto: "fern_match" }],
    });
    expect(act("r1/opponent", "next")).toMatchObject({ ok: false });
    expect(act("r1/root", "next", "empty")).toMatchObject({ ok: false });
    expect(act("r1/root", "next", "loading")).toMatchObject({ ok: false });
  });
});

describe("Fixtures scoreboard options", () => {
  const row = { ...first, live: true, clock: "Q3 04:12" };

  it.each(["list", "next", "scoreboard"])("draws the live score and game clock in %s", (style) => {
    const input = { style, matches: [row, { ...first, live: false }] };
    const parts = addressedElements(render(input));
    expect(JSON.stringify(parts.get(address("r1/live")))).toContain("Live");
    expect(parts.get(address("r1/clock"))?.text).toEqual(["Q3 04:12"]);
    expect(parts.get(address("r1/score"))?.text).toEqual(["3–1"]);
    expect(parts.get(address("r1/time"))?.text).toEqual(["10:00"]);
    expect(parts.has(address("r1/result"))).toBe(false);
    expect(parts.has(address("r2/result"))).toBe(style !== "next");
    expect(readComponent(def, input, "f1").join("\n")).toContain("3–1 · Live · Q3 04:12");
    expect(addressedElements(render(input, "loading")).get(address("r1/live"))?.attributes).toContain(
      'aria-hidden="true"',
    );
  });

  it("accepts live matches without a score and rejects invalid clock data", () => {
    const input = { ...row, us: undefined, them: undefined };
    expect(props.safeParse({ matches: [input] }).success).toBe(true);
    for (const patch of [{ live: "true" }, { clock: " " }, { clock: "a".repeat(13) }])
      expect(props.safeParse({ matches: [{ ...input, ...patch }] }).success).toBe(false);
  });
});

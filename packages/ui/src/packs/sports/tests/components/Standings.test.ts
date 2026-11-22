import { describe, expect, expectTypeOf, it } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  packReady,
  partTierAt,
  placeholderTitle,
  planAct,
  readComponent,
  stampItemIds,
  type CastLike,
  type Props,
  type StateName,
} from "@lmthing/ui/catalog";
import { addressedElements, renderInstance } from "../../../../../test/render";

const def = components.Standings;
const { meta, props, examples, fallback, probes } = def;
const full = examples[0]!;
const seed = full.rows[0]!;
const sorted = { ...full, rows: [full.rows[2]!, full.rows[1]!, seed] };
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const address = (part: string) => `home/s1/${part}`;
const render = (input: unknown, state: StateName = "filled") =>
  renderInstance("Standings", input, state, theme, { component: "s1" });

describe("Standings schema and bounds", () => {
  it.each(examples)("accepts each domain example", (input) =>
    expect(props.safeParse(input).success).toBe(true),
  );
  it("trims teams, applies defaults and stamps row ids only for the renderer", () => {
    type View = Props<typeof props, typeof meta>;
    expectTypeOf<View["rows"][number]["id"]>().toEqualTypeOf<string>();
    expectTypeOf<View>().not.toBeAny();
    expect(props.parse({ rows: [{ ...seed, team: " Fern House " }, seed] })).toMatchObject({
      detail: "full",
      lines: [],
      scoring: { win: 3, draw: 1 },
      rows: [seed, seed],
    });
  });
  // prettier-ignore
  it.each([
    {}, { rows: [seed] }, { rows: Array(21).fill(seed) }, { ...full, detail: "hidden" },
    { ...full, density: "dense" }, { ...full, color: "#000" }, { ...full, lines: [1, 1] },
    { ...full, lines: [0] }, { ...full, lines: [3] }, { ...full, lines: [1, 2, 3] },
    { ...full, mine: -1 }, { ...full, mine: 3 }, { ...full, scoring: { win: 100, draw: 0 } },
    { ...full, scoring: { win: 2, draw: -1 } },
  ])("rejects invalid input %j", (input) => expect(props.safeParse(input).success).toBe(false));
  // prettier-ignore
  it.each([
    { team: " " }, { team: "a".repeat(21) }, { won: -1 }, { drawn: 1.5 }, { lost: Infinity },
    { for: -1 }, { against: "1" }, { form: ["win"] }, { form: Array(6).fill("w") },
    { id: "r1" }, { position: 1 }, { points: 13 }, { difference: 9 }, { played: 5 },
  ])("rejects invalid row data %j", (patch) =>
    expect(props.safeParse({ rows: [{ ...seed, ...patch }, seed] }).success).toBe(false));
  it("accepts 20 teams with 20-character names, five results and cuts near the end", () => {
    const row = { ...seed, team: "a".repeat(20) };
    expect(props.safeParse({ rows: Array(20).fill(row), mine: 19, lines: [1, 19] }).success).toBe(true);
    expect(props.parse({ ...full, detail: "brief" }).rows[0]?.form).toEqual(seed.form);
  });
});

describe("Standings fallback and metadata", () => {
  it("uses bounded cast titles and shared neutral placeholders", () => {
    const empty: CastLike = { things: [], items: [] };
    const item = { id: "one", type: "team", sample: true, name: "a".repeat(40) };
    const cast = { things: [{ type: "team", fields: ["name"] }], items: [item] };
    const malformed = { ...cast, items: [{ ...item, name: 10 }] };
    for (const candidate of [empty, cast, malformed])
      expect(props.safeParse(fallback({ cast: candidate })).success).toBe(true);
    expect(fallback({ cast: empty }).rows.map(({ team }) => team)).toEqual([
      placeholderTitle(0),
      placeholderTitle(1),
    ]);
    expect(fallback({ cast }).rows[0]?.team).toBe("a".repeat(20));
    expect(fallback({ cast: malformed }).rows[0]?.team).toBe(placeholderTitle(0));
  });
  it("preserves dense limits, tiers, pack readiness and the core-first probes", () => {
    expect(meta).toMatchObject({ dense: true, weight: 3, tier: "phone" });
    expect(partTierAt(meta, {}, "root")).toBe("people");
    expect(meta.realPath).not.toBe("");
    expect(createRegistry({ packs: ["sports"] }).ids.includes("Standings")).toBe(packReady("sports"));
    expect(probes.filter(({ kind }) => kind === "choose").map(({ expect }) => expect)).toEqual([
      "Standings",
      "List",
    ]);
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "write", expect: "Standings" }),
        expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
        expect.objectContaining({ kind: "read", expect: { address: "s1/r2", action: "press" } }),
      ]),
    );
  });
});

describe("Standings parts, states and reading", () => {
  it("keeps addresses and selection from the input order while drawing the computed ranks", () => {
    const parts = addressedElements(render(sorted));
    for (const part of meta.parts) expect(parts.has(address(part))).toBe(part !== "group");
    for (const part of meta.items.parts)
      expect(parts.has(address(`r3/${part}`))).toBe(part !== "percentage" && part !== "games_behind");
    expect(parts.get(address("r3/root"))?.attributes).toContain('role="button"');
    expect(parts.get(address("r2/root"))?.attributes).toContain('aria-pressed="true"');
    expect(parts.get(address("r3/position"))?.text).toEqual(["1"]);
    expect(parts.get(address("r3/team"))?.text.join("")).toContain("Fern House");
    expect(parts.get(address("r3/played"))?.text).toEqual(["5"]);
    expect(parts.get(address("r3/points"))?.text).toEqual(["13"]);
    expect(parts.get(address("r1/difference"))?.text).toEqual(["-4"]);
    const reading = readComponent(def, sorted, "s1");
    expect(reading[0]).toContain("r3: Fern House · 1 · 5 · 4 · 1 · 0 · 9 · 13 · W W D W W");
    expect(reading.join("\n")).toContain("[s1/r3 press !needs-people]");
  });
  it("only removes form in brief detail, without hiding any row action", () => {
    const before = addressedElements(render(full));
    const brief = { ...full, detail: "brief" };
    const after = addressedElements(render(brief));
    expect([...before.keys()].filter((key) => !after.has(key))).toEqual(
      ["r1", "r2", "r3"].map((id) => address(`${id}/form`)),
    );
    const compact = addressedElements(render({ ...full }));
    expect([...compact.keys()]).toEqual([...before.keys()]);
    const reading = readComponent(def, brief, "s1").join("\n");
    expect(reading).not.toContain("Form");
    expect(reading).not.toContain("W W D W W");
    expect(reading).toContain("[s1/r1 press !needs-people]");
  });
  it("shows inert loading without presenting any team data or actions", () => {
    const html = render(full, "loading");
    const parts = addressedElements(html);
    expect(parts.has(address("root"))).toBe(true);
    expect(parts.has(address("table"))).toBe(true);
    const rowParts = [...parts.entries()].filter(
      ([key]) => key.startsWith(address("r")) && key !== address("root"),
    );
    expect(rowParts).toHaveLength(full.rows.length);
    expect(
      rowParts.every(
        ([key, element]) => key.endsWith("/form") && element.attributes.includes('aria-hidden="true"'),
      ),
    ).toBe(true);
    expect(html).not.toContain('role="button"');
    const reading = readComponent(def, full, "s1", "loading").join("\n");
    expect(reading).not.toContain("Fern House");
    expect(reading).not.toContain("press");
  });
});

describe("Standings divisions and win-percentage format", () => {
  const input = {
    ...full,
    group: "East Division",
    format: "pct_gb",
    mine: 0,
    lines: [1],
    rows: [
      { ...seed, team: "More losses", won: 7, drawn: 0, lost: 4 },
      { ...seed, team: "Leader", won: 8, drawn: 0, lost: 2 },
      { ...seed, team: "One tie", won: 5, drawn: 1, lost: 4 },
      { ...seed, team: "No games", won: 0, drawn: 0, lost: 0 },
    ],
  };

  it("orders by percentage with half wins for ties and keeps the original row addresses", () => {
    const parts = addressedElements(render(input));
    expect(parts.get(address("group"))?.text).toEqual(["East Division"]);
    expect(parts.get(address("r2/position"))?.text).toEqual(["1"]);
    expect(parts.get(address("r2/percentage"))?.text).toEqual(["80%"]);
    expect(parts.get(address("r1/games_behind"))?.text).toEqual(["1.5"]);
    expect(parts.get(address("r1/root"))?.attributes).toContain('aria-pressed="true"');
    expect(parts.get(address("r3/percentage"))?.text).toEqual(["55%"]);
    expect(parts.get(address("r4/percentage"))?.text).toEqual(["–"]);
    expect(parts.has(address("r1/points"))).toBe(false);
    expect(parts.has(address("r1/difference"))).toBe(false);
    const reading = readComponent(def, input, "s1").join("\n");
    expect(reading).toContain("r1: More losses · 2 · 11 · 7 · 0 · 4 · 63.6% · 1.5");
    expect(reading).toContain("East Division");
    expect(reading).toContain("[s1/r1 press");
  });

  it("keeps football points as the default and validates the new options", () => {
    const legacy = { ...full, format: undefined };
    const parts = addressedElements(render(legacy));
    const explicit = addressedElements(render(full));
    expect(parts.get(address("hint"))?.text).toEqual(["Scroll for more stats"]);
    for (const part of ["position", "points", "difference", "form"])
      expect(parts.get(address(`r1/${part}`))?.text).toEqual(explicit.get(address(`r1/${part}`))?.text);
    expect(readComponent(def, legacy, "s1").join("\n")).toContain("Scroll for more stats");
    expect(props.safeParse({ ...full, group: "x".repeat(17) }).success).toBe(false);
    expect(props.safeParse({ ...full, format: "wins" }).success).toBe(false);
    expect(readComponent(def, input, "s1", "loading").join("\n")).not.toContain("East Division");
  });

  it("ranks a winless team above an unplayed team and leaves unplayed GB blank", () => {
    const rows = [
      { ...seed, won: 0, drawn: 0, lost: 0 },
      { ...seed, won: 0, drawn: 0, lost: 3 },
    ];
    const parts = addressedElements(render({ ...input, rows }));
    expect(parts.get(address("r2/position"))?.text).toEqual(["1"]);
    expect(parts.get(address("r2/percentage"))?.text).toEqual(["0%"]);
    expect(parts.get(address("r1/position"))?.text).toEqual(["2"]);
    expect(parts.get(address("r1/games_behind"))?.text).toEqual(["–"]);
  });
});

describe("Standings read and act", () => {
  it("presses only a filled team root and does not edit records or navigate", () => {
    const act = (part: string, state: StateName = "filled", action = "press") =>
      planAct({ id: "home", components: [{ ...sorted, state, c: "Standings", id: "s1" }] }, components, {}, [
        { address: address(part), action },
      ]);
    expect(affordancesOf(meta, stampItemIds(meta, props.parse(sorted)), "s1")).toEqual(
      ["r1", "r2", "r3"].map((id) => ({ address: `s1/${id}`, part: "root", action: "press", detail: "" })),
    );
    expect(act("r3/root")).toMatchObject({ ok: true, values: {}, links: [], changed: ["s1/r3 press"] });
    expect(act("r3/points")).toMatchObject({ ok: false });
    expect(act("r4/root")).toMatchObject({ ok: false });
    expect(act("r3/root", "filled", "toggle")).toMatchObject({ ok: false });
    expect(act("r3/root", "loading")).toMatchObject({ ok: false });
  });
});

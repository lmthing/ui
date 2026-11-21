import { describe, expect, it } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  placeholderTitle,
  planAct,
  readComponent,
  type StateName,
} from "@lmthing/ui/catalog";
import { addressedElements, renderInstance } from "../../../../../test/render";

const def = components.Bracket;
const { props, examples, fallback, probes } = def;
const sample = examples[0]!;
const tie = { a: "Ledge Rovers", b: "Fern House" };
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const address = (part: string) => `home/b1/${part}`;
const render = (input: unknown, state: StateName = "filled", lang = "en") =>
  addressedElements(renderInstance("Bracket", input, state, theme, { component: "b1", lang }));

describe("Bracket contract", () => {
  it.each(examples)("accepts a domain example", (input) => expect(props.safeParse(input).success).toBe(true));

  it("stamps a round-major projection without writing a second list", () => {
    const parsed = props.parse(sample);
    expect(parsed.ties.map(({ round, a }) => [round, a])).toEqual([
      ["Semifinals", "Ledge Rovers"],
      ["Semifinals", "Garden Crew"],
      ["Final", "Ledge Rovers"],
    ]);
    expect(props.safeParse({ ...sample, ties: [] }).success).toBe(false);
    const round = { label: "a".repeat(16), ties: Array(8).fill({ ...tie, bScore: 0 }) };
    expect(props.parse({ rounds: Array(4).fill(round) }).ties).toHaveLength(32);
    expect(props.safeParse({ rounds: Array(5).fill(round) }).success).toBe(false);
    expect(props.safeParse({ rounds: [{ ...round, ties: Array(9).fill(tie) }] }).success).toBe(false);
    expect(props.safeParse({ rounds: [{ ...round, ties: [] }] }).success).toBe(false);
  });

  // prettier-ignore
  it.each([
    {}, { rounds: [] }, { ...sample, color: "#000" }, { ...sample, detail: "none" },
    { ...sample, mine: "x".repeat(17) }, { rounds: [{ label: "x".repeat(17), ties: [tie] }] },
    ...[{ a: "" }, { b: "x".repeat(17) }, { aScore: -1 }, { bScore: 1.5 },
      { bScore: "1" }, { winner: "a" }].map((patch) => ({
        rounds: [{ label: "Final", ties: [{ ...tie, ...patch }] }],
      })),
  ])("rejects invalid input %j", (input) => expect(props.safeParse(input).success).toBe(false));

  it("uses cast titles and neutral placeholders for missing or malformed entrants", () => {
    const empty = { things: [], items: [] };
    const item = { id: "entrant", type: "club", sample: true, name: "Oakfield" };
    const cast = { things: [{ type: "club", fields: ["name"] }], items: [item] };
    const malformed = { ...cast, items: [{ ...item, name: 3 }] };
    for (const candidate of [empty, cast, malformed])
      expect(props.safeParse(fallback({ cast: candidate })).success).toBe(true);
    const neutral = [
      { label: placeholderTitle(2), ties: [{ a: placeholderTitle(0), b: placeholderTitle(1) }] },
    ];
    expect(fallback({ cast: empty }).rounds).toEqual(neutral);
    expect(fallback({ cast: malformed }).rounds).toEqual(neutral);
    expect(fallback({ cast }).rounds[0]?.ties[0]?.a).toBe("Oakfield");
  });

  it("keeps the tier split, readiness gate and core near miss", () => {
    expect(def.meta).toMatchObject({ dense: true, tier: "phone", partTiers: { root: "people" } });
    expect(createRegistry({ packs: ["sports"] }).ids.includes("Bracket")).toBe(packReady("sports"));
    expect(probes.filter(({ kind }) => kind === "choose").map(({ expect }) => expect)).toEqual([
      "Bracket",
      "List",
    ]);
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "write", expect: "Bracket" }),
        expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
        expect.objectContaining({ kind: "read", expect: { address: "b1/r3", action: "press" } }),
      ]),
    );
  });
});

describe("Bracket rendering and actions", () => {
  it("addresses shared round headings, names, and only supplied scores", () => {
    const keys = render(sample, "filled", "ar-EG");
    expect(keys.has(address("root"))).toBe(true);
    for (const id of ["r1", "r2", "r3"]) {
      expect(keys.get(address(`${id}/root`))?.attributes).toContain('role="button"');
      for (const part of ["round", "a", "b"]) expect(keys.has(address(`${id}/${part}`))).toBe(true);
    }
    expect(keys.get(address("r1/a_score"))?.text).toContain("٣");
    expect(keys.get(address("r2/a_score"))?.text).toContain("٠");
    expect(renderInstance("Bracket", sample, "filled", theme)).toContain(">Final<");
    for (const part of ["a_score", "b_score"]) expect(keys.has(address(`r3/${part}`))).toBe(false);
    expect(keys.get(address("r1/root"))?.attributes).toContain("Ledge Rovers wins");
  });

  it("hides scores only in brief detail and leaves no tie parts while loading", () => {
    const keys = render(sample);
    const brief = render({ ...sample, detail: "brief" });
    expect([...keys.keys()].filter((key) => !brief.has(key)).sort()).toEqual(
      ["r1/a_score", "r1/b_score", "r2/a_score", "r2/b_score"].map(address),
    );
    expect(brief.get(address("r1/root"))?.attributes).toContain("Ledge Rovers wins");
    expect([...render({ ...sample, surface: "outlined", density: "compact" }).keys()]).toEqual([
      ...keys.keys(),
    ]);
    expect([...render(sample, "loading").keys()].sort()).toEqual(["bracket", "root", "title"].map(address));
  });

  it("reads the same teams and scores, and allows only filled tie presses", () => {
    const read = (input: unknown, state: StateName) => readComponent(def, input, "b1", state).join("\n");
    expect(read(sample, "filled")).toContain("r2: Semifinals, Garden Crew 0 · Oakfield 2 · Oakfield wins");
    expect(read({ ...sample, detail: "brief" }, "filled")).toContain(
      "Garden Crew · Oakfield · Oakfield wins",
    );
    expect(read({ ...sample, detail: "brief" }, "filled")).not.toContain("Garden Crew 0");
    expect(read(sample, "loading")).not.toContain("Oakfield");
    const act = (part: string, state: StateName = "filled", action = "press") =>
      planAct({ id: "home", components: [{ ...sample, c: "Bracket", id: "b1", state }] }, components, {}, [
        { address: address(part), action },
      ]);
    expect(act("r3")).toMatchObject({ ok: true });
    for (const part of ["root", "r4", "r1/a", "r1/round", "r1/b_score"]) expect(act(part).ok).toBe(false);
    expect(act("r1", "filled", "set").ok).toBe(false);
    expect(act("r1", "loading").ok).toBe(false);
  });
});

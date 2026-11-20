import { describe, expect, it, vi } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  placeholderTitle,
  readComponent,
  stampItemIds,
  type ScreenLike,
  type StateName,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../test/render";

const def = components.ScoreSheet;
const { props, meta, examples, fallback, probes } = def;
const cast = { things: [], items: [] };
const grid = examples[0]!;
const round = { ...grid, overflow: "page" } as const;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const draw = (input: unknown, state: StateName = "filled") =>
  addressedElements(renderInstance("ScoreSheet", input, state, theme, "game"));
const address = (part: string) => `home/c1/${part}`;

function start(input: Record<string, unknown> = grid) {
  const screen: ScreenLike = {
    id: "home",
    components: [
      { id: "s1", c: "ScoreSheet", ...input },
      { id: "s2", c: "ScoreSheet", ...grid },
    ],
  };
  const onAction = vi.fn();
  const runtime = createScreenController({ defs: { ScoreSheet: def }, screen, onAction });
  const run = (part: string, action: string, value?: unknown) =>
    runtime.act({ address: `s1/${part}`, action, value });
  const scores = (index = 0) => runtime.snapshotScreen().components[index]?.rounds;
  return { runtime, scores, run, onAction };
}

describe("ScoreSheet contract and bounds", () => {
  it.each(examples)("parses each example", (input) => expect(props.safeParse(input).success).toBe(true));
  it("defaults to high, grid and no sharing, trims labels and stamps round-major addresses", () => {
    const parsed = props.parse({
      players: [{ name: " Anna " }, { name: " Ben " }],
      rounds: [
        { label: " First ", points: [-999, null] },
        { label: " Second ", points: [0, 999] },
      ],
    });
    expect(parsed).toMatchObject({ wins: "high", overflow: "all", share: false, selectedRound: "1" });
    expect(stampItemIds(meta, parsed)).toMatchObject({
      cells: [
        { id: "r1", player: "Anna", round: "First", score: -999 },
        { id: "r2", player: "Ben", round: "First", score: null },
        { id: "r3", player: "Anna", round: "Second", score: 0 },
        { id: "r4", player: "Ben", round: "Second", score: 999 },
      ],
    });
  });
  it("accepts the exact dense limits", () => {
    const players = Array.from({ length: 6 }, () => ({ name: "n".repeat(24) }));
    const rounds = Array.from({ length: 12 }, () => ({
      label: "r".repeat(16),
      points: [999, 0, null, -999, 2, -5],
    }));
    expect(stampItemIds(meta, props.parse({ players, rounds }))).toHaveProperty("cells.length", 72);
  });
  it.each([
    { players: [] },
    { players: [{ name: "A" }] },
    { players: Array(7).fill({ name: "A" }) },
    { players: [{ name: "n".repeat(25) }, { name: "B" }, { name: "C" }] },
    { rounds: [] },
    { rounds: Array(13).fill(grid.rounds[0]) },
    ...[
      [1, 2],
      [1, 2, 3, 4],
      [1.5, 0, 0],
      [1000, 0, 0],
      [-1000, 0, 0],
      ["1", 0, 0],
    ].map((points) => ({
      rounds: [{ label: "First", points }],
    })),
    { rounds: [{ label: "r".repeat(17), points: [1, 2, 3] }] },
    { wins: "both" },
    { style: "tiles" },
    { share: "yes" },
    { selectedRound: "3" },
    { color: "red" },
    { cells: [] },
    { total: 10 },
    { winners: ["Anna"] },
  ])("rejects out-of-bounds and writer-owned data: %o", (overrides) =>
    expect(props.safeParse({ ...grid, ...overrides }).success).toBe(false),
  );
});

describe("ScoreSheet fallback and metadata", () => {
  it("uses neutral placeholders without items, and safe cast names otherwise", () => {
    const seed = fallback({ cast });
    expect(seed.players.map(({ name }) => name)).toEqual([placeholderTitle(0), placeholderTitle(1)]);
    expect(seed.rounds[0]?.points).toEqual([null, null]);
    const items = [
      { id: "fern", type: "plant", sample: true, name: "Fern" },
      { id: "bad", type: "plant", sample: true, name: 42 },
    ];
    const matching = fallback({ cast: { things: [{ type: "plant", fields: ["name"] }], items } });
    expect(matching.players[0]).toEqual({ name: "Fern" });
    expect(props.safeParse(matching).success).toBe(true);
    expect(props.safeParse(fallback({ cast: { ...cast, items: items.slice(1) } })).success).toBe(true);
    expect(props.safeParse(seed).success).toBe(true);
  });
  it("ships the probe shapes, risk tiers and pack readiness gate", () => {
    expect(meta).toMatchObject({ weight: 3, dense: true, tier: "phone", partTiers: { share: "people" } });
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "ScoreSheet" }),
        expect.objectContaining({ kind: "choose", expect: "Counter" }),
        expect.objectContaining({ kind: "write", expect: "ScoreSheet" }),
        expect.objectContaining({ kind: "write", variant: { axis: "overflow", value: "page" } }),
        expect.objectContaining({ kind: "read", expect: { address: "s1/r1/score", action: "set" } }),
      ]),
    );
    expect(createRegistry({ packs: ["play"] }).ids.includes("ScoreSheet")).toBe(packReady("play"));
  });
});

describe("ScoreSheet states and parts", () => {
  it("renders every grid score at its own spinbutton address and shares only if enabled", () => {
    const gridView = draw(grid);
    expect(gridView.get(address("root"))?.attributes).toContain('role="radiogroup"');
    for (let index = 1; index <= 6; index++) {
      expect(gridView.has(address(`r${index}/root`))).toBe(true);
      expect(gridView.get(address(`r${index}/score`))?.attributes).toContain('role="spinbutton"');
    }
    expect(gridView.has(address("share"))).toBe(true);
    expect(draw({ ...grid, share: false }).has(address("share"))).toBe(false);
  });
  it("keeps one set of inputs in round mode and renders explicit empty/loading/success states", () => {
    const next = draw({ ...round, selectedRound: "2" });
    expect(next.has(address("r1/score"))).toBe(false);
    expect(next.get(address("r4/score"))?.attributes).toContain('role="spinbutton"');
    expect(draw(grid, "empty").get(address("empty"))?.text).toContain("No games yet");
    expect(draw(grid, "loading").has(address("r1/score"))).toBe(false);
    expect(draw(grid, "loading").has(address("reset"))).toBe(false);
    expect(draw(grid, "success").get(address("r1/score"))?.text).toContain("4");
    expect(draw(grid, "success").has(address("share"))).toBe(false);
  });
});

describe("ScoreSheet read and act", () => {
  it.each([1.5, 1000, -1000, "8", null])("does not store invalid score %s", (value) => {
    const { run, scores } = start();
    expect(run("r1/score", "set", value)).toMatchObject({ ok: false, code: "invalid_value" });
    expect(scores()).toEqual(grid.rounds);
  });
  it("updates the snapshot, reading and totals when a later score is edited", () => {
    const { run, runtime, scores } = start();
    expect(run("r5/score", "set", 999)).toMatchObject({ ok: true });
    expect(scores()).toEqual([grid.rounds[0], { label: "Round 2", points: [3, 999, 3] }]);
    expect(runtime.read()).toContain("Ben · Total: 1001 · Winner");
    expect(runtime.read()).toContain("[s1/r5/score set = 999]");
    expect(runtime.read()).toContain("[s1/share press !needs-people]");
  });
  it("selects and edits only a visible round in round mode", () => {
    const { run, runtime } = start(round);
    expect(run("root", "select", "3")).toMatchObject({ ok: false, code: "invalid_value" });
    expect(run("r4/score", "set", 12)).toMatchObject({ ok: false, code: "not_actionable" });
    expect(run("root", "select", "2")).toMatchObject({ ok: true });
    expect(runtime.read()).not.toContain("[s1/r1/score set");
    expect(runtime.read()).toContain("[s1/r4/score set");
    expect(run("r4/score", "set", -999)).toMatchObject({ ok: true });
    expect(runtime.read()).toContain("Anna, Round 2: -999");
  });
  it("offers and dispatches share only when enabled", () => {
    const off = start({ ...grid, share: false });
    expect(off.run("share", "press")).toMatchObject({ ok: false, code: "not_actionable" });
    const on = start();
    expect(on.run("share", "press")).toMatchObject({ ok: true });
    expect(on.onAction).toHaveBeenCalledWith(expect.objectContaining({ address: "home/s1/share" }));
  });
  it("only clears the intended component after confirmation, without clearing on cancel", () => {
    const { run, runtime, scores } = start(round);
    expect(run("r1/score", "set", 0)).toMatchObject({ ok: true });
    const edited = scores();
    expect(run("reset", "press")).toMatchObject({ ok: true });
    expect(runtime.confirmation?.source).toBe("home/s1/reset");
    expect(scores()).toEqual(edited);
    expect(runtime.act({ address: "confirm/cancel", action: "dismiss" })).toMatchObject({ ok: true });
    expect(scores()).toEqual(edited);
    expect(run("reset", "press")).toMatchObject({ ok: true });
    expect(runtime.act({ address: "confirm/confirm", action: "press" })).toMatchObject({ ok: true });
    expect(scores()).toEqual(grid.rounds.map(({ label }) => ({ label, points: [null, null, null] })));
    expect(scores(1)).toEqual(grid.rounds);
    expect(runtime.read()).toContain("0 of 2 rounds complete");
    expect(readComponent(def, grid, "s1", "loading")).toEqual(["s1 ScoreSheet (loading)"]);
  });
});

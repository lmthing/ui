import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  components,
  createRegistry,
  drawKey,
  drawState,
  emptyLine,
  packReady,
  stampItemIds,
  themeName,
  type CastLike,
  type Props,
  type StateName,
} from "@lmthing/ui/catalog";
import { createScreenController, KitProvider, PartScope } from "@lmthing/ui/kit";
import type { input } from "zod";
import { addressedElements, config } from "../../../../test/render";
import { TeamPicker as view } from "../components";
const { props, meta, examples, fallback, probes } = components.TeamPicker;
type Setup = input<typeof props>;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const setup = examples[0]!;
const address = (part: string) => `home/t1/${part}`;
const make = { address: "t1/make", action: "press" };
const remake = { address: "t1/remake", action: "press" };
const confirm = { address: "confirm/confirm", action: "press" };
const cancel = { address: "confirm/cancel", action: "dismiss" };
const impossible = { ...setup, players: setup.players.map((player) => ({ ...player, team: 0 })) };
// Draft views are excluded from the generated renderer map until their probes pass.
// prettier-ignore
function render(input: Setup, state: StateName, thing?: string) {
  const stamped = stampItemIds(meta, props.parse(input)) as Props<typeof props, typeof meta>;
  return renderToStaticMarkup(createElement(TamaguiProvider, { config, defaultTheme: themeName(theme) },
    createElement(KitProvider, { theme, children: null },
      createElement(PartScope, { screen: "home", component: "t1", rev: 1, state, ...(thing ? { thing } : {}), children: null },
        createElement(view.TeamPicker, stamped)))));
}
function game(input: Setup = setup, state: StateName = "empty", random = vi.fn(() => 0)) {
  const screen = { id: "home", components: [{ ...input, id: "t1", c: "TeamPicker", state }] };
  const onAction = vi.fn();
  const runtime = createScreenController({ screen, defs: components, random, onAction });
  const result = (roster = input) =>
    drawState(meta, props.parse(roster), (part) => runtime.store.get(address(part)));
  return { runtime, result, random, onAction };
}

describe("TeamPicker contract and boundaries", () => {
  it("defaults to columns, trims labels, and accepts exact maximum lengths and counts", () => {
    const players = Array.from({ length: 12 }, () => ({ name: "n".repeat(24), photo: "local:1", team: 3 }));
    const teams = Array.from({ length: 4 }, (_, index) => ({ label: ` ${String(index).repeat(16)} ` }));
    expect(props.parse({ players, teams })).toMatchObject({
      players,
      teams: teams.map(({ label }) => ({ label: label.trim() })),
      arrange: "strip",
    });
    expectTypeOf<Props<typeof props, typeof meta>["players"][number]["id"]>().toEqualTypeOf<string>();
  });

  it.each([
    { players: setup.players.slice(0, 1) },
    { players: Array.from({ length: 13 }, () => ({ name: "Player" })) },
    { players: [{ name: "n".repeat(25) }, ...setup.players] },
    { players: [{ name: "Anna", photo: "https://example.org/photo.png" }, ...setup.players] },
    { players: [{ name: "Anna", id: "r1" }, ...setup.players] },
    { players: [{ name: "Anna", team: -1 }, ...setup.players] },
    { players: [{ name: "Anna", team: 1.5 }, ...setup.players] },
    { players: [{ name: "Anna", team: 3 }, ...setup.players] },
    { teams: [{ label: "Only" }] },
    { teams: ["A", "B", "C", "D", "E"].map((label) => ({ label })) },
    { teams: [{ label: "One" }, { label: " one " }] },
    { teams: [{ label: "n".repeat(17) }, { label: "Two" }] },
    { style: "grid" },
    { assignments: [0, 1] },
    { [drawKey]: {} },
    { color: "red" },
  ])("rejects invalid, derived, and unknown props", (input) => {
    expect(props.safeParse({ ...setup, ...input }).success).toBe(false);
  });

  it("retains the phone tier, dense limits, core-first probes and pack gate", () => {
    expect(meta).toMatchObject({ tier: "phone", weight: 3, dense: true, confirmParts: ["remake"] });
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(probes).toEqual([
      expect.objectContaining({ kind: "choose", expect: "TeamPicker" }),
      expect.objectContaining({ kind: "choose", expect: "Choice" }),
      expect.objectContaining({ kind: "write", expect: "TeamPicker" }),
      expect.objectContaining({ kind: "write", variant: { axis: "arrange", value: "rows" } }),
      expect.objectContaining({ kind: "read", expect: make }),
      expect.objectContaining({ kind: "read", expect: remake }),
    ]);
    expect(createRegistry({ packs: ["play"] }).ids.includes("TeamPicker")).toBe(packReady("play"));
  });
});

describe("TeamPicker fallback", () => {
  it("uses cast titles and neutral placeholders without inventing locks", () => {
    const items: CastLike["items"] = [{ id: "a", type: "person", sample: true, name: "Alex" }];
    const cast = { things: [{ type: "person", fields: ["name"] }], items };
    const empty = { things: [], items: [] };
    const malformed = { ...cast, items: [{ ...items[0]!, name: 42 }] };
    for (const seed of [cast, empty, malformed])
      expect(props.safeParse(fallback({ cast: seed })).success).toBe(true);
    expect(fallback({ cast }).players).toEqual([{ name: "Alex" }, { name: "Item two" }]);
    expect(fallback({ cast: empty })).toEqual({
      players: [{ name: "Item one" }, { name: "Item two" }],
      teams: [{ label: "Item one" }, { label: "Item two" }],
    });
  });
});

describe("TeamPicker states and parts", () => {
  it.each(examples)("draws the team panels and preserves roster addresses in both styles", (example) => {
    expect(props.safeParse(example).success).toBe(true);
    const html = render(example, "filled");
    const parts = addressedElements(html);
    expect(parts.has(address("root"))).toBe(true);
    expect(parts.has(address("teams"))).toBe(true);
    expect(parts.get(address("make"))?.attributes).toContain('role="button"');
    expect(parts.has(address("remake"))).toBe(false);
    for (const [index, player] of example.players.entries()) {
      const item = `r${index + 1}`;
      expect(parts.has(address(`${item}/root`))).toBe(true);
      expect(parts.get(address(`${item}/name`))?.text).toEqual([player.name]);
      expect(parts.get(address(`${item}/photo`))?.attributes).toContain('role="img"');
      expect(parts.has(address(`${item}/team`))).toBe("team" in player);
    }
  });

  it("draws an empty message and first action, but no action or player parts while loading", () => {
    const empty = render(setup, "empty", "game");
    expect(empty).toContain(emptyLine("game"));
    expect(addressedElements(empty).has(address("make"))).toBe(true);
    const loading = render(setup, "loading");
    const parts = addressedElements(loading);
    expect(parts.has(address("teams"))).toBe(true);
    expect(parts.has(address("r1/name"))).toBe(false);
    expect(parts.has(address("make"))).toBe(false);
    expect(parts.has(address("remake"))).toBe(false);
  });

  it("accepts infeasible locks as data but draws an error rather than unbalanced teams", () => {
    expect(props.safeParse(impossible).success).toBe(true);
    const parts = addressedElements(render(impossible, "filled"));
    expect(parts.has(address("error"))).toBe(true);
    expect(parts.has(address("teams"))).toBe(false);
    expect(parts.has(address("make"))).toBe(false);
  });
});

describe("TeamPicker read and act", () => {
  it("draws from empty, reads the stored grouping, and rejects stale results after roster edits", () => {
    const { runtime, result, onAction } = game();
    expect(runtime.read()).toContain("TeamPicker (empty) [t1/make press]");
    expect(runtime.act(remake).ok).toBe(false);
    onAction.mockImplementationOnce(() => expect(result()).toMatchObject({ teams: [0, 0, 1, 2, 2, 1] }));
    expect(runtime.act(make).ok).toBe(true);
    expect(runtime.read()).toContain("Teams are set — Leaves (2): Anna (locked), Ben (locked)");
    expect(runtime.read()).toContain("[t1/remake press]");
    expect(runtime.read()).not.toContain("[t1/make press]");
    expect(runtime.snapshotScreen().components[0]).not.toHaveProperty(drawKey);
    expect(result({ ...setup, teams: [{ label: "One" }, ...setup.teams.slice(1)] })).toEqual({
      kind: "partition",
      teams: [],
    });
  });

  it("offers redraw in success and preserves the result until confirmed", () => {
    const random = vi.fn(() => 0);
    const { runtime, result, onAction } = game(examples[1], "success", random);
    expect(runtime.act(make).ok).toBe(true);
    const first = result();
    const calls = random.mock.calls.length;
    expect(runtime.act(make).ok).toBe(false);
    expect(runtime.act(remake).ok).toBe(true);
    expect(runtime.read()).toContain("[confirm/confirm press]");
    expect(runtime.act(cancel).ok).toBe(true);
    expect(result()).toEqual(first);
    expect(random).toHaveBeenCalledTimes(calls);
    expect(onAction).toHaveBeenCalledTimes(1);
    random.mockReturnValue(3);
    expect(runtime.act(remake).ok).toBe(true);
    expect(runtime.act(confirm).ok).toBe(true);
    expect(result()).not.toEqual(first);
    expect(onAction).toHaveBeenCalledTimes(2);
  });

  it.each([
    [setup, "loading"],
    [impossible, "filled"],
  ] as const)("blocks both draw actions while loading or when locks are infeasible", (input, state) => {
    const { runtime, random } = game(input, state);
    expect(runtime.read()).toMatch(/TeamPicker \((loading|error)\)$/);
    for (const action of [make, remake]) expect(runtime.act(action).ok).toBe(false);
    expect(random).not.toHaveBeenCalled();
  });
});

import { describe, expect, it } from "vitest";
import { components, readComponent, readScreen } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const def = components.BoxScore;
const { meta, examples, fallback, props } = def;
const cast = { things: [], items: [] };
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const seed = examples[0]!;

describe("BoxScore schema", () => {
  it.each(examples)("accepts domain examples", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );

  it("accepts the maximum period and player table sizes", () => {
    const periods = Array.from({ length: 9 }, (_, i) => ({ label: `Set ${i + 1}`, home: 999, away: i }));
    const columns = Array.from({ length: 8 }, (_, i) => `Column ${i}`);
    const players = Array.from({ length: 16 }, (_, i) => ({ name: `Player ${i + 1}`, stats: columns }));
    expect(
      props.parse({ ...seed, periods, columns, homePlayers: players, awayPlayers: players }).totals,
    ).toEqual({ home: 8991, away: 36 });
  });

  it.each([
    { home: "x".repeat(21) },
    { periods: [] },
    { periods: Array.from({ length: 10 }, () => seed.periods[0]) },
    { periods: [{ label: "Q1", home: -1, away: 7 }] },
    { periods: [{ label: "Overtime", home: 1000, away: 7 }] },
    { columns: ["PTS", "REB", "AST", "Long stat", "PF"] },
    { awayPlayers: [{ name: "Sam", stats: ["1", "2", "3"] }] },
    { homePlayers: [{ name: "Amara", pos: "start", stats: ["1", "2", "3", "4", "5"] }] },
    { homePlayers: [{ ...seed.homePlayers[0], goto: "not an id" }] },
    { homePlayers: Array.from({ length: 17 }, () => seed.homePlayers[0]) },
    { awayPlayers: [] },
    { team: "guest" },
    { style: "grid" },
    { color: "red" },
    { totals: { home: 0, away: 0 } },
  ])("rejects undeclared or out-of-range data", (extra) => {
    expect(props.safeParse({ ...seed, ...extra }).success).toBe(false);
  });
});

it("falls back to neutral labels and takes usable titles from the cast", () => {
  const things = [{ type: "player", fields: ["name"] }];
  const items = [{ id: "fern", type: "player", name: "Fern", sample: true }];
  const named = fallback({ cast: { things, items } });
  const empty = fallback({ cast });
  const malformed = fallback({ cast: { things, items: items.map((item) => ({ ...item, name: 3 })) } });
  for (const value of [named, empty, malformed]) expect(props.safeParse(value).success).toBe(true);
  expect(named.home).toBe("Fern");
  expect(empty.home).toBe("Item one");
  expect(malformed.away).toBe("Item two");
});

it("draws the line score and sticky player rail; limits addresses to the selected roster and state", () => {
  const filled = renderInstance("BoxScore", seed, "filled", theme);
  const parts = addressedElements(filled);
  for (const part of ["line_score", "team", "players", "r1/root", "r1/position", "r2/root"]) {
    expect(parts.has(`home/c1/${part}`), part).toBe(true);
  }
  expect(filled).toContain("Amara Field");
  expect(filled).not.toContain("Sam Banks");
  const brief = addressedElements(renderInstance("BoxScore", { ...seed, detail: "brief" }, "filled", theme));
  expect(brief.has("home/c1/r1/position")).toBe(false);
  const away = addressedElements(renderInstance("BoxScore", { ...seed, team: "away" }, "filled", theme));
  expect(away.has("home/c1/r4/root")).toBe(true);
  expect(away.has("home/c1/r1/root")).toBe(false);
  const line = addressedElements(renderInstance("BoxScore", examples[1], "filled", theme));
  expect(line.has("home/c1/line_score")).toBe(true);
  expect(line.has("home/c1/team")).toBe(false);
  expect(renderInstance("BoxScore", seed, "empty", theme)).toContain("has not been recorded yet");
  const loading = renderInstance("BoxScore", seed, "loading", theme);
  expect(loading).toContain('aria-busy="true"');
  expect(addressedElements(loading).has("home/c1/r1/root")).toBe(false);
});

it("switches the addressed roster on-device without letting unlinked or hidden rows open profiles", () => {
  const screen = { id: "home", components: [{ id: "c1", c: meta.id, ...seed }] };
  const visits: string[] = [];
  const controller = createScreenController({
    screen,
    defs: components,
    onLink: (goto) => {
      visits.push(goto);
    },
  });
  const select = (value: string) => controller.act({ address: "c1/team", action: "select", value });
  const open = (part: string) => controller.act({ address: `c1/${part}`, action: "press" });
  try {
    expect(open("r2").ok).toBe(false);
    expect(open("r4").ok).toBe(false);
    expect(open("r1").ok).toBe(true);
    expect(select("guest").ok).toBe(false);
    expect(select("away").ok).toBe(true);
    const reading = readScreen(screen, components, controller.store.snapshot());
    expect(reading).toContain("r4: Sam Banks (SF) · MIN 36");
    expect(reading).not.toContain("Amara Field");
    expect(open("r1").ok).toBe(false);
    expect(open("r4").ok).toBe(true);
    expect(select("home").ok).toBe(true);
    expect(open("r1").ok).toBe(true);
    expect(visits).toEqual(["amara_field", "sam_banks", "amara_field"]);
  } finally {
    controller.dispose();
  }
});

it("declares a core near miss and offers only the actions drawn for each mode", () => {
  expect(def.probes.find((probe) => probe.kind === "choose" && probe.expect === "Stats")).toBeDefined();
  const filled = readComponent(def, seed, "c1").join("\n");
  expect(filled).toContain("[c1/team select");
  expect(filled).toContain("[c1/r1 press");
  expect(filled).not.toContain("[c1/r2 press");
  expect(readComponent(def, { ...seed, style: "linescore" }, "c1").join("\n")).not.toMatch(
    /\b(select|press)\b/,
  );
  for (const state of ["loading", "empty"] as const)
    expect(readComponent(def, seed, "c1", state).join("\n")).not.toMatch(/\b(select|press)\b/);
});

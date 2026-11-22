import { expect, it } from "vitest";
import { affordancesOf, components, readComponent, readScreen } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";
import { MatchStats } from "../../components";

const { examples, fallback, meta, probes, props } = MatchStats;

const cast = { things: [], items: [] };
const valid = fallback({ cast });
const invalid = [
  { ...valid, unknown: "invalid" },
  { ...valid, home: "x".repeat(21) },
  { ...valid, away: "x".repeat(21) },
  { ...valid, periods: Array.from({ length: 6 }, () => "x") },
  { ...valid, periods: ["x", "x"] },
  { ...valid, periods: ["x".repeat(13)] },
  { ...valid, periodAt: -1 },
  { ...valid, periodAt: 5 },
  { ...valid, periods: ["Full match"], periodAt: 1 },
  { ...valid, metrics: [] },
  { ...valid, metrics: valid.metrics.slice(0, 1) },
  { ...valid, metrics: Array.from({ length: 11 }, () => ({ label: "x", homeValue: 0, awayValue: 0 })) },
  { ...valid, metrics: valid.metrics.map((metric) => ({ ...metric, label: "x".repeat(25) })) },
  { ...valid, metrics: valid.metrics.map((metric) => ({ ...metric, homeValue: -1 })) },
  { ...valid, metrics: valid.metrics.map((metric) => ({ ...metric, unit: "goals" })) },
  {
    ...valid,
    metrics: valid.metrics.map((metric) => ({ ...metric, periodValues: [{ homeValue: 2, awayValue: 2 }] })),
  },
  { ...valid, style: "not-a-choice!" },
  { ...valid, color: "#ff0000" },
] satisfies Record<string, unknown>[];

it.each(examples)("accepts a domain example", (example) => {
  expect(props.safeParse(example).success).toBe(true);
});

it.each<Record<string, unknown>>(invalid)("rejects invalid input", (input) => {
  expect(props.safeParse(input).success).toBe(false);
});

it("validates the fallback for empty and populated casts", () => {
  expect(props.safeParse(fallback({ cast })).success).toBe(true);
  expect([valid.home, valid.away]).toEqual(["Item one", "Item two"]);
  const things = [{ type: "item", fields: ["name"] }];
  const items = [{ id: "one", type: "item", name: "Sample", sample: true }];
  for (const name of ["Sample", 42]) {
    expect(
      props.safeParse(fallback({ cast: { things, items: items.map((item) => ({ ...item, name })) } }))
        .success,
    ).toBe(true);
  }
});

it("declares a core near miss, a variant write and the period action", () => {
  expect(probes.map(({ kind }) => kind)).toEqual(["choose", "choose", "write", "write", "read"]);
  expect(probes[1]).toMatchObject({ kind: "choose", expect: "Bars" });
  expect(readComponent(MatchStats, examples[0], "c1").join("\n")).toContain("[c1/period select");
  expect(affordancesOf(meta, props.parse(valid), "c1")).toEqual([]);
});

const seed = examples[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;

it("draws numbers in both variants, with the period part only when supplied", () => {
  const render = (input: object, state: "filled" | "loading" | "empty") =>
    renderInstance("MatchStats", input, state, theme);
  const full = render(seed, "filled");
  const brief = render({ ...seed, detail: "brief" }, "filled");
  for (const html of [full, brief]) {
    expect(html).toContain("58%");
    expect(html).toContain("Shots on target");
    expect(addressedElements(html).get("home/c1/period")?.attributes).toContain('role="radiogroup"');
  }
  expect(full.length).toBeGreaterThan(brief.length);
  expect(addressedElements(render(valid, "filled")).has("home/c1/period")).toBe(false);
  expect(render(seed, "empty")).toContain("Match stats are unavailable.");
  expect(render(seed, "loading")).toContain('aria-busy="true"');
  for (const state of ["loading", "empty"] as const)
    expect(readComponent(MatchStats, seed, "c1", state).join("\n")).not.toContain("period select");
});

it("switches to the requested comparison without overwriting the seed or mislabelling missing data", () => {
  const screen = { id: "home", components: [{ id: "c1", c: meta.id, ...seed }] };
  const controller = createScreenController({ screen, defs: components });
  const select = (value: string | number) =>
    controller.act({ address: "c1/period", action: "select", value });
  const reading = () => readScreen(screen, components, controller.store.snapshot());
  try {
    expect(reading()).toContain("Possession: Sunday Kickers 58%, River Rovers 42%");
    expect(select(2).ok).toBe(false);
    expect(select("First half").ok).toBe(true);
    expect(reading()).toContain("Possession: Sunday Kickers 46%, River Rovers 54%");
    expect(select(0).ok).toBe(true);
    expect(reading()).toContain("Selected period: Full match");
    expect(seed.metrics[0]?.homeValue).toBe(58);
  } finally {
    controller.dispose();
  }
  const missing = { ...valid, periods: ["Full match", "First half"] };
  expect(
    readComponent(MatchStats, missing, "c1", "filled", { "c1/$selection/periodAt": 1 }).join("\n"),
  ).toContain("Match stats are unavailable.");
});

it("accepts the maximum bounds and maps alternate values around a nonzero initial selection", () => {
  const periods = ["Full match", "Q1", "Q2", "Q3", "Q4"];
  const metric = {
    label: "x".repeat(24),
    homeValue: 7,
    awayValue: 5,
    periodValues: [1, 2, 3, 4].map((homeValue) => ({ homeValue, awayValue: 0 })),
  };
  const input = { ...valid, periods, periodAt: 2, home: "x".repeat(20), metrics: Array(10).fill(metric) };
  expect(props.parse(input).metrics).toHaveLength(10);
  for (const [periodAt, home, away] of [
    [0, 1, 0],
    [2, 7, 5],
    [4, 4, 0],
  ]) {
    const read = readComponent(MatchStats, input, "c1", "filled", {
      "c1/$selection/periodAt": periodAt,
    }).join("\n");
    expect(read).toContain(`${input.home} ${home}, Item two ${away}`);
  }
});

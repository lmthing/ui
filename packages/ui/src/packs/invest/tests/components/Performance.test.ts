import { describe, expect, it } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  planAct,
  readComponent,
  readScreen,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { portfolioKind, type Portfolio } from "../../ledger";
import { addressedElements, renderExample } from "../../../../../test/render";

const def = components.Performance;
const date = (day: number) => `2026-01-0${day}T00:00:00Z`;
const statement: Portfolio = {
  portfolioId: "education",
  since: date(1),
  openingCash: 0,
  openingContributed: 0,
  positions: [
    { assetId: "fund", name: "Global Equity Fund", symbol: "GEF", class: "fund", units: 0, unitCost: 0 },
  ],
  entries: [
    { id: "first_deposit", at: date(2), kind: "deposit", amount: 1000 },
    { id: "first_buy", at: date(2), kind: "buy", assetId: "fund", units: 10, unitPrice: 80 },
  ],
  quotes: [],
  distributions: [],
};
const seed = {
  portfolioId: statement.portfolioId,
  title: "Portfolio history",
  samples: [
    { at: date(1), quotes: [] },
    { at: date(2), quotes: [] },
    { at: date(3), quotes: [{ assetId: "fund", price: 90 }] },
  ],
};
const data = { [portfolioKind]: [statement] };
const screen = { id: "home", components: [{ id: "p1", c: "Performance", ...seed }] };
const defs = { Performance: def };
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;

describe("Performance contract", () => {
  it.each(def.examples)("accepts the example and renders every declared state", (example) => {
    expect(def.props.safeParse(example).success).toBe(true);
    for (const state of def.meta.states) {
      const addressed = addressedElements(renderExample("Performance", example, state, theme).html);
      expect(addressed.has("home/c1/root")).toBe(true);
      expect(addressed.has("home/c1/r1/root")).toBe(state === "filled");
      expect(addressed.has("home/c1/range")).toBe(state === "filled" || state === "empty");
    }
  });

  it("bounds dates and quotes without accepting calculated amounts", () => {
    for (const input of [
      { ...seed, color: "blue" },
      { ...seed, title: "a".repeat(33) },
      { ...seed, range: "week" },
      { ...seed, samples: seed.samples.slice(0, 1) },
      { ...seed, samples: [...seed.samples].reverse() },
      { ...seed, samples: [seed.samples[0], { ...seed.samples[1], at: "2026-01-01T01:00:00+01:00" }] },
      { ...seed, samples: [seed.samples[0], { ...seed.samples[1], value: 0 }] },
      {
        ...seed,
        samples: [
          seed.samples[0],
          { ...seed.samples[2], quotes: Array(2).fill({ assetId: "fund", price: 0 }) },
        ],
      },
    ])
      expect(def.props.safeParse(input).success).toBe(false);
    expect(def.props.parse(seed)).toMatchObject({ range: "all", detail: "full" });
  });

  it("uses cast names or neutral placeholders and keeps the core near miss", () => {
    const casts = [
      { things: [], items: [] },
      { things: [], items: [{ id: "education", type: "fund", sample: true, name: "Pension" }] },
      { things: [], items: [{ id: "education", type: "fund", sample: true, name: 4 }] },
    ];
    expect(casts.map((cast) => def.props.parse(def.fallback({ cast })).title)).toEqual([
      "Item one",
      "Pension",
      "Item one",
    ]);
    expect(def.probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Sparkline" }));
    expect(createRegistry({ packs: ["invest"] }).ids.includes("Performance")).toBe(packReady("invest"));
  });
});

it("replays only synthetic statements at the gallery's fixed clock", () => {
  const input = def.props.parse(def.examples[0]);
  const fixture = def.meta.previewDeviceData({ input, state: "filled" });
  const exampleScreen = { ...screen, components: [{ id: "p1", c: "Performance", ...def.examples[0]! }] };
  const preview = createScreenController({
    screen: exampleScreen,
    defs,
    deviceData: fixture,
    now: () => 0,
  });
  const live = createScreenController({
    screen: exampleScreen,
    defs,
    deviceData: structuredClone(fixture),
    now: () => 0,
  });
  try {
    expect(preview.read()).toContain("[p1/r2 select]");
    expect(live.read()).toContain("Performance (error)");
  } finally {
    preview.dispose();
    live.dispose();
  }
});

describe("Performance ledger", () => {
  it("preserves a missing quote and distinguishes gain from money paid in", () => {
    const read = readScreen(screen, defs, {}, "en", data, "USD");
    expect(read).toContain("Portfolio value Unknown; Net contributions $1,000; Gain / loss Unknown.");
    expect(read).toContain("Portfolio value $1,100; Net contributions $1,000; Gain / loss +$100.");
    expect(read).toContain("[p1/r2 select]");
    expect(readScreen(screen, defs, {}, "en", { [portfolioKind]: [] })).toContain("Performance (error)");
    expect(readComponent(def, seed, "p1").join("\n")).toContain("Connect a portfolio statement");
  });

  it("allows range changes on an empty range without rebasing or renumbering points", () => {
    const latest = { at: "2026-03-09T00:00:00Z", quotes: [{ assetId: "fund", price: 85 }] };
    const multiMonth = {
      ...screen,
      components: [{ ...screen.components[0]!, samples: [...seed.samples, latest] }],
    };
    const at = Date.parse(latest.at);
    const range = planAct(
      multiMonth,
      defs,
      {},
      [{ address: "p1/range", action: "select", value: "month" }],
      null,
      "planner",
      data,
      at,
    );
    expect(range.ok).toBe(true);
    if (!range.ok) return;
    const narrow = readScreen(multiMonth, defs, range.values, "en", data);
    expect(narrow).toContain("Performance (empty)");
    expect(narrow).toContain("[p1/range select");
    expect(narrow).not.toContain("[p1/r1 select]");
    const reopen = planAct(
      multiMonth,
      defs,
      range.values,
      [
        { address: "p1/range", action: "select", value: "all" },
        { address: "p1/r4", action: "select" },
      ],
      null,
      "planner",
      data,
      at,
    );
    expect(reopen).toMatchObject({ ok: true, values: { "home/p1/r4": latest.at } });
    if (reopen.ok)
      expect(readScreen(multiMonth, defs, reopen.values, "en", data)).toContain(
        "Net contributions $1,000; Gain / loss +$50",
      );
  });
});

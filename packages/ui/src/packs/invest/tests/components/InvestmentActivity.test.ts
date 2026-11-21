import { describe, expect, it } from "vitest";
import { components, createRegistry, packReady, readComponent } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderExample } from "../../../../../test/render";
import { portfolioKind, type Portfolio } from "../../ledger";

const def = components.InvestmentActivity;
const input = def.examples[0]!;
const first = input.entries[0]!;
const next = input.entries[1]!;
const now = Date.parse("2026-03-20T00:00:00Z");
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const screen = { id: "home", components: [{ ...input, c: "InvestmentActivity", id: "i1" }] };
const defs = { InvestmentActivity: def };
const fixture = def.meta.previewDeviceData({ input, state: "filled" });
const portfolio = fixture[portfolioKind]![0] as Portfolio;
const journal = "$record:investment_portfolios:education";

describe("InvestmentActivity contract", () => {
  it.each(def.examples)(
    "parses examples and stamps the drawn entries and conditional controls",
    (example) => {
      expect(def.props.safeParse(example).success).toBe(true);
      for (const state of def.meta.states) {
        const nodes = addressedElements(renderExample("InvestmentActivity", example, state, theme).html);
        expect(nodes.has("home/c1/root")).toBe(true);
        expect(nodes.has("home/c1/r1/root")).toBe(state === "filled");
        expect(nodes.has("home/c1/add")).toBe((state === "filled" || state === "empty") && example === input);
        if (state === "filled") {
          expect(nodes.has("home/c1/r1/void")).toBe(example === input);
          expect(nodes.has("home/c1/r2/void")).toBe(true);
          expect(nodes.has("home/c1/r3/void")).toBe(false);
          expect(nodes.has("home/c1/r2/unit_price")).toBe(example === input);
          expect(nodes.has("home/c1/r1/fee")).toBe(example !== input);
        }
      }
    },
  );

  it("accepts exactly 20 entries and rejects mixed seed shapes or computed cash", () => {
    const entries = Array.from({ length: 20 }, (_, i) => ({ ...first, id: `e_${i}` }));
    expect(def.props.safeParse({ ...input, entries }).success).toBe(true);
    for (const bad of [
      [...entries, next],
      [first, first],
      [{ ...first, amount: 0 }],
      [{ ...first, units: 3 }],
      [{ ...first, kind: "dividend" }],
      [{ ...next, fee: -1 }],
      [{ ...next, unitPrice: undefined }],
      [{ ...next, movement: -800 }],
      [{ ...next, at: "2025-12-31T23:00:00Z" }],
    ])
      expect(def.props.safeParse({ ...input, entries: bad }).success).toBe(false);
    expect(def.props.parse(input).entries[1]?.fee).toBe(0);
  });

  it("validates neutral or cast-led fallbacks and retains the Timeline near miss", () => {
    const cast = { things: [], items: [] };
    expect(def.props.parse(def.fallback({ cast }))).toMatchObject({ portfolioId: "item_1", entries: [] });
    const full = { ...cast, things: [{ type: "fund", fields: ["name"] }] };
    expect(def.props.parse(def.fallback({ cast: full })).portfolioId).toBe("fund");
    expect(
      def.props.safeParse(def.fallback({ cast: { ...cast, things: [{ type: "not an id", fields: [] }] } }))
        .success,
    ).toBe(true);
    expect(def.probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Timeline" }));
    expect(createRegistry({ packs: ["invest"] }).ids.includes("InvestmentActivity")).toBe(
      packReady("invest"),
    );
  });
});

it("opens the add form and the source, rejects voiding dividends, and confirms a manual void", () => {
  const accepted: string[] = [];
  const deviceData = {
    [portfolioKind]: [
      {
        ...portfolio,
        distributions: [
          {
            id: "first_dividend",
            assetId: "global_fund",
            entitledAt: "2026-03-01T00:00:00Z",
            payOn: "2026-03-10",
            perUnit: 1,
            receivedAt: "2026-03-10T09:00:00Z",
            goto: "fund_income",
          },
        ],
      } satisfies Portfolio,
    ],
  };
  const controller = createScreenController({
    screen,
    defs,
    deviceData,
    now: () => now,
    onLink: (target) => {
      accepted.push(target);
    },
  });
  try {
    const before = controller.read();
    expect(before).toContain("Dividend · Global Equity Fund");
    expect(before).toContain("+$10");
    expect(before).not.toContain("[i1/r3/void");
    expect(controller.press("i1/r3/void").ok).toBe(false);
    expect(controller.press("i1/add").ok).toBe(true);
    expect(controller.press("i1/r3").ok).toBe(true);
    expect(accepted).toEqual(["record_trade", "fund_income"]);
    expect(controller.press("i1/r2/void").ok).toBe(true);
    expect(controller.store.get(journal)).toBeUndefined();
    expect(controller.press("confirm/cancel").ok).toBe(true);
    expect(controller.store.get(journal)).toBeUndefined();
    expect(controller.press("i1/r2/void").ok).toBe(true);
    expect(controller.press("confirm/confirm").ok).toBe(true);
    expect(controller.store.get(journal)).toEqual([
      { id: "first_buy", kind: "void", at: new Date(now).toISOString() },
    ]);
    expect(controller.read()).toContain("Entry voided");
    expect(controller.read()).toContain("Voided");
    expect(controller.press("i1/r2/void").ok).toBe(false);
  } finally {
    controller.dispose();
  }
});

it("leaves the journal untouched when a correction would overdraw the account", () => {
  const deviceData = { [portfolioKind]: [{ ...portfolio, distributions: [] } satisfies Portfolio] };
  const controller = createScreenController({ screen, defs, deviceData, now: () => now });
  try {
    expect(controller.press("i1/r1/void")).toMatchObject({ ok: false });
    expect(controller.confirmation).toBeUndefined();
    expect(controller.store.get(journal)).toBeUndefined();
  } finally {
    controller.dispose();
  }
});

it("keeps stable ids in date order, windowing the latest 20 host records; empty screens keep only add", () => {
  const entries = Array.from({ length: 21 }, (_, i) => ({
    id: `e_${i}`,
    kind: "deposit" as const,
    amount: 1,
    at: new Date(Date.parse(portfolio.since) + i * 86400000).toISOString(),
  }));
  const deviceData = { [portfolioKind]: [{ ...portfolio, entries, distributions: [] } satisfies Portfolio] };
  const controller = createScreenController({ screen, defs, deviceData, now: () => now });
  try {
    const read = controller.read();
    expect(read).toContain("1 earlier entry");
    expect(read).toContain("[i1/r2/void press]");
    expect(read).toContain("[i1/r21/void press]");
    expect(read).not.toContain("[i1/r1/void");
  } finally {
    controller.dispose();
  }
  const empty = readComponent(def, input, "i1", "empty", {}, undefined, {
    [portfolioKind]: [{ ...portfolio, entries: [], distributions: [] }],
  });
  expect(empty.join(" ")).toContain("[i1/add press");
  expect(empty.join(" ")).not.toContain("r1/");
});

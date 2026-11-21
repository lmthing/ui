import { describe, expect, it } from "vitest";
import { components, createRegistry, packReady, readComponent } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderExample } from "../../../../../test/render";
import { portfolioKind, type Portfolio } from "../../ledger";

const def = components.Dividends;
const input = def.examples[0]!;
const first = input.distributions[0]!;
const now = Date.parse("2026-03-20T00:00:00Z");
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const screen = { id: "home", components: [{ ...input, c: "Dividends", id: "d1" }] };
const defs = { Dividends: def };
const fixture = def.meta.previewDeviceData({ input, state: "filled" });
const portfolio = fixture[portfolioKind]![0] as Portfolio;
const journal = "$record:investment_portfolios:education";

describe("Dividends contract", () => {
  it.each(def.examples)("parses and stamps only visible controls in every state", (example) => {
    expect(def.props.safeParse(example).success).toBe(true);
    for (const state of def.meta.states) {
      const nodes = addressedElements(renderExample("Dividends", example, state, theme).html);
      expect(nodes.has("home/c1/root")).toBe(true);
      expect(nodes.has("home/c1/r1/root")).toBe(state === "filled");
      expect(nodes.has("home/c1/r1/receive")).toBe(state === "filled" && example === input);
      expect(nodes.has("home/c1/r1/void")).toBe(state === "filled" && example !== input);
    }
  });

  it("bounds the seed and rejects model-written cash or receipt state", () => {
    for (const changes of [
      { id: "Bad id" },
      { assetId: "a".repeat(25) },
      { entitledAt: "2026-03-01T00:00:00" },
      { payOn: "2026-02-29" },
      { payOn: "2026-02-28" },
      { perUnit: 0 },
      { withheld: -1 },
      { receivedAt: "2026-03-09T08:00:00Z" },
      { net: 8 },
      { received: true },
      { color: "red" },
    ])
      expect(def.props.safeParse({ ...input, distributions: [{ ...first, ...changes }] }).success).toBe(
        false,
      );
    for (const distributions of [[], [first, first], Array(7).fill(first)])
      expect(def.props.safeParse({ ...input, distributions }).success).toBe(false);
  });

  it("uses a neutral fallback, keeps the Timeline near miss, and follows readiness", () => {
    const cast = { things: [], items: [] };
    const fallback = def.fallback({ cast });
    expect(def.props.parse(fallback).distributions[0]!.assetId).toBe("item_1");
    expect(readComponent(def, fallback, "d1").join(" ")).toContain("Item one");
    expect(
      def.props.safeParse(
        def.fallback({ cast: { ...cast, items: [{ id: "bad", type: "fund", sample: true, name: 4 }] } }),
      ).success,
    ).toBe(true);
    expect(def.probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Timeline" }));
    expect(createRegistry({ packs: ["invest"] }).ids.includes("Dividends")).toBe(packReady("invest"));
  });
});

it("gates receipt before pay day and refuses unknown entitlement or negative net", () => {
  const cases = [
    [fixture, Date.parse("2026-03-09T23:59:59Z")],
    [{ [portfolioKind]: [{ ...portfolio, distributions: [{ ...first, withheld: 11 }] }] }, now],
    [{ [portfolioKind]: [{ ...portfolio, since: "2026-03-02T00:00:00Z" }] }, now],
  ] as const;
  for (const [deviceData, at] of cases) {
    const controller = createScreenController({ screen, defs, deviceData, now: () => at });
    try {
      expect(controller.read()).not.toContain("[d1/r1/receive");
      expect(controller.press("d1/r1/receive").ok).toBe(false);
      expect(controller.store.get(journal)).toBeUndefined();
    } finally {
      controller.dispose();
    }
  }
});

it("records once, confirms reversal, and permits a new revision after reversing", () => {
  const controller = createScreenController({
    screen,
    defs,
    deviceData: fixture,
    now: () => now,
    currency: "EUR",
  });
  try {
    expect(controller.read()).toContain("Global Equity Fund · Expected");
    expect(controller.read()).toContain("Gross €10 · Withheld €2");
    expect(controller.read()).toContain("[d1/r1 press");
    expect(controller.read()).not.toContain("[d1/r1/void");
    expect(controller.press("d1/r1/receive").ok).toBe(true);
    expect(controller.read()).toContain("Receipt recorded");
    expect(controller.read()).toContain("Net cash · €8");
    expect(controller.press("d1/r1/receive").ok).toBe(false);
    expect(controller.press("d1/r1/void").ok).toBe(true);
    expect(controller.store.get(journal)).toHaveLength(1);
    expect(controller.press("confirm/cancel").ok).toBe(true);
    expect(controller.store.get(journal)).toHaveLength(1);
    expect(controller.press("d1/r1/void").ok).toBe(true);
    expect(controller.press("confirm/confirm").ok).toBe(true);
    expect(controller.read()).toContain("Expected");
    expect(controller.read()).not.toContain("Receipt recorded");
    expect(controller.press("d1/r1/void").ok).toBe(false);
    expect(controller.press("d1/r1/receive").ok).toBe(true);
    expect(controller.store.get(journal)).toMatchObject([
      { kind: "receive", revision: 1 },
      { kind: "reverse", revision: 1 },
      { kind: "receive", revision: 2 },
    ]);
  } finally {
    controller.dispose();
  }
});

it("sorts received rows newest first without changing addresses", () => {
  const received = [
    { ...first, id: "older", receivedAt: "2026-03-10T09:00:00Z" },
    { ...first, id: "later", receivedAt: "2026-03-12T09:00:00Z" },
    { ...first, id: "expected" },
  ];
  const view = { ...screen, components: [{ ...screen.components[0]!, style: "received" }] };
  const controller = createScreenController({
    screen: view,
    defs,
    deviceData: { [portfolioKind]: [{ ...portfolio, distributions: received }] },
    now: () => now,
  });
  try {
    const read = controller.read();
    expect(read).toContain("[d1/r2/void press");
    expect(read.indexOf("r2 · Global Equity Fund")).toBeLessThan(read.indexOf("r1 · Global Equity Fund"));
    expect(read).not.toContain("[d1/r3");
  } finally {
    controller.dispose();
  }
});

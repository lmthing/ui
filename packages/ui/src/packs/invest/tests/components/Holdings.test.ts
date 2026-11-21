import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  components,
  createRegistry,
  emptyLine,
  packReady,
  readComponent,
  type DeviceData,
  type Props,
  type StateName,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";
import { visibleTexts } from "../../../../../test/variants";
import { Holdings as module, pack } from "../..";
import { investWordsFor } from "../../lang";
import { portfolioKind, type Portfolio } from "../../ledger";

const { Holdings } = components;
const { meta, props, fallback, examples, probes } = Holdings;
type Input = ReturnType<typeof fallback>;
const book: Input = examples[0]!;
const seed: Input = {
  ...book,
  positions: [book.positions[0]!, { ...book.positions[1]!, units: 0, unitCost: 0, goto: "income_fund" }],
};
const row = seed.positions[0]!;
const words = investWordsFor().holdings;
const screen = (input = seed, state: StateName = "filled") => ({
  id: "home",
  components: [{ id: "h1", c: meta.id, state, ...input }],
});
const data = (portfolio: Portfolio): DeviceData => ({ [portfolioKind]: [portfolio] });
const read = (input = seed, host?: DeviceData, state: StateName = "filled") =>
  readComponent(Holdings, input, "h1", state, {}, "en", host).join("\n");
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const render = (input = seed, state: StateName = "filled", deviceData?: DeviceData) =>
  renderInstance(meta.id, input, state, theme, { component: "h1", deviceData });
const statement: Portfolio = {
  portfolioId: seed.portfolioId,
  since: seed.asOf,
  openingCash: 100,
  openingContributed: 900,
  positions: seed.positions.map(({ price: _price, quotedAt: _date, ...position }) => position),
  entries: [],
  quotes: [],
  distributions: [],
};

describe("Holdings schema and fallback", () => {
  it.each(examples)("accepts domain examples", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("bounds wire seeds and rejects addressed and computed fields", () => {
    // prettier-ignore
    for (const patch of [
      { name: "x".repeat(33) }, { symbol: "x".repeat(13) }, { class: "cash" },
      { units: -1 }, { unitCost: -1 }, { quotedAt: "2026-03-01T16:00:00" }, { goto: "Bad ID" },
      { value: 900 }, { gain: 100 }, { id: "r1" }, { color: "red" },
    ])
      expect(props.safeParse({ ...seed, positions: [{ ...row, ...patch }] }).success).toBe(false);
    const positions = Array.from({ length: 6 }, (_, i) => ({ ...row, assetId: `p_${i}` }));
    expect(props.parse({ ...seed, positions }).positions).toHaveLength(6);
    expect(props.safeParse({ ...seed, positions: [...positions, { ...row, assetId: "p_6" }] }).success).toBe(
      false,
    );
    expect(props.safeParse({ ...seed, positions: [row, row] }).success).toBe(false);
    expect(props.parse({ ...seed, positions: [] }).positions).toEqual([]);
    expect(props.safeParse({ ...seed, quote_service: true }).success).toBe(false);
    expect(props.safeParse({ ...seed, detail: "tiny" }).success).toBe(false);
    expectTypeOf<Props<typeof props, typeof meta>["positions"][number]["id"]>().toEqualTypeOf<string>();
  });
  it("seeds from matching cast content and uses neutral placeholders for malformed or missing cast content", () => {
    for (const [name, expected] of [
      ["North Index", "North Index"],
      [4, "Item one"],
    ] as const) {
      const input = fallback({
        cast: {
          things: [{ type: "fund", fields: ["name"] }],
          items: [{ id: "north", type: "fund", sample: true, name }],
        },
      });
      expect(props.parse(input).positions[0]).toMatchObject({ name: expected, units: 0 });
    }
    const empty = props.parse(fallback({ cast: { things: [], items: [] } }));
    expect(empty.positions[0]).toMatchObject({ name: "Item one", units: 0 });
  });
  it("keeps the pack gate, service tier and required probes", () => {
    expect(createRegistry({ packs: [pack.id] }).ids.includes(meta.id)).toBe(packReady(pack.id));
    expect(meta).toMatchObject({ tier: "phone", partTiers: { refresh: "service" } });
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "List" }),
        expect.objectContaining({ kind: "write", variant: { axis: "detail", value: "brief" } }),
        expect.objectContaining({ kind: "read", expect: { address: "h1/r1", action: "press" } }),
      ]),
    );
  });
});

describe("Holdings parts, states and actions", () => {
  it("reads only visible parts and removes detail without shifting the remaining addresses", () => {
    const brief = { ...seed, detail: "brief" as const };
    const parts = (input = seed) => [...addressedElements(render(input)).keys()];
    expect(parts().filter((key) => !/\/(?:unit_cost|price|quoted_at|gain)$/.test(key))).toEqual(parts(brief));
    expect(parts()).not.toContain("home/h1/r2/root");
    expect(read()).toContain("Gain +$100");
    expect(read()).toContain(row.quotedAt);
    expect(read(brief)).not.toContain(row.quotedAt);
    expect(read(brief)).toContain("Value $900");
    expect(read()).toContain("[h1/r1 press→global_fund]");
    expect(read()).not.toContain("Income Fund");
  });
  it("filters a later row without moving it to the first address", () => {
    const holdings: Input = { ...book, assetId: "income_fund" };
    const html = render(holdings);
    expect(addressedElements(html).has("home/h1/r2/root")).toBe(true);
    expect(addressedElements(html).has("home/h1/r1/root")).toBe(false);
    expect(read(holdings)).toContain("Gain -$6");
  });
  it("shows inert loading, shared empty copy, and saved figures after a failed refresh", () => {
    for (const state of ["loading", "empty", "error"] as const) {
      const html = render(seed, state);
      expect(html).not.toMatch(/role="(?:link|button)"/);
      expect(read(seed, undefined, state)).not.toContain("[h1/r1 press");
      expect(visibleTexts(html).includes("$900")).toBe(state === "error");
    }
    expect(visibleTexts(render({ ...seed, positions: [] }))).toContain(emptyLine(undefined));
    expect(visibleTexts(render(seed, "error"))).toContain(words.refreshFailed);
  });
  it("navigates only linked, visible positions and refreshes only through an attached service", () => {
    const onLink = vi.fn(),
      onAction = vi.fn();
    withController({ screen: screen(), defs: { Holdings }, onLink }, (offline) => {
      expect(offline.press("h1/r2").ok).toBe(false);
      expect(offline.press("h1/refresh").ok).toBe(false);
      expect(offline.press("h1/r1").ok).toBe(true);
      expect(onLink).toHaveBeenCalledExactlyOnceWith("global_fund", "home/h1/r1");
    });
    const bound = module.bindHoldings((id) => id === "h1");
    withController({ screen: screen(), defs: { Holdings: bound }, onAction }, (online) => {
      expect(online.read()).toContain("[h1/refresh press !needs-service]");
      expect(online.press("h1/refresh").ok).toBe(true);
      expect(onAction).toHaveBeenCalledExactlyOnceWith({ address: "home/h1/refresh", action: "press" });
    });
    for (const state of ["loading", "empty", "error"] as const) {
      withController({ screen: screen(seed, state), defs: { Holdings: bound } }, (controller) => {
        expect(controller.press("h1/refresh").ok).toBe(false);
        expect(controller.press("h1/r1").ok).toBe(false);
      });
    }
  });
});

describe("Holdings ledger projections", () => {
  it("uses later trades, saved zero and missing quotes instead of reusing the opening values", () => {
    // prettier-ignore
    const host = data({
      ...statement,
      entries: [{ id: "buy_income", kind: "buy", assetId: "income_fund", units: 1, unitPrice: 10, at: "2026-03-01T08:00:00Z" }],
      quotes: [{ assetId: row.assetId, price: 0, quotedAt: "2026-03-03T16:00:00Z" }],
    });
    const text = visibleTexts(render(seed, "filled", host));
    for (const line of ["$0", "Gain -$800", "Income Fund", "1 unit", "Unknown", "No saved quote"])
      expect(text).toContain(line);
    for (const line of text) expect(read(seed, host)).toContain(line);
    expect(render(seed, "filled", { [portfolioKind]: [] })).toContain(words.ledgerUnavailable);
  });
  it("bounds host positions to six, reports the rest and filters before truncation", () => {
    const positions = Array.from({ length: 8 }, (_, i) => ({
      ...statement.positions[0]!,
      assetId: `fund_${i}`,
      name: `Fund ${i + 1}`,
      goto: undefined,
    }));
    const host = data({ ...statement, positions });
    const html = render(seed, "filled", host);
    expect(visibleTexts(html)).toContain("and 2 more");
    expect(read(seed, host)).toContain("and 2 more");
    expect(addressedElements(html).has("home/h1/r7/root")).toBe(false);
    const filtered = { ...seed, assetId: "fund_7" };
    expect(addressedElements(render(filtered, "filled", host)).has("home/h1/r8/root")).toBe(true);
    expect(read(filtered, host)).not.toContain("and 2 more");
  });
});

type Controller = ReturnType<typeof createScreenController>;
function withController(
  options: Parameters<typeof createScreenController>[0],
  run: (value: Controller) => void,
) {
  const controller = createScreenController(options);
  try {
    run(controller);
  } finally {
    controller.dispose();
  }
}

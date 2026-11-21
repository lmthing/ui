import { expect, it } from "vitest";
import { z } from "zod";
import { planAct, readScreen, type Definition, type Meta, type ScreenLike } from "../../../catalog";
import { createAgentAccess, createInteractionStore, createScreenController } from "../../../kit/interact";
import { activityLedger, dividendsLedger, holdingsLedger, performanceLedger, portfolioKind } from "./index";
import { date, now, statement } from "./fixtures";

const common = z.strictObject({ portfolioId: z.string().default("education") });
function definition(id: string, extra: Partial<Meta>, props = common): Definition {
  return {
    meta: {
      id,
      group: "data",
      purpose: "Fixture",
      pick: "Fixture",
      region: "body",
      weight: 2,
      tier: "phone",
      realPath: "Local records",
      ...extra,
    },
    props,
    fallback: () => ({}),
    examples: [],
    probes: [],
  };
}
const defs = {
  Holdings: definition("Holdings", { ...holdingsLedger, items: { key: "positions", parts: [] } }),
  Performance: definition(
    "Performance",
    {
      ...performanceLedger,
      items: { key: "samples", parts: ["root"] },
      actions: { parts: { range: ["select"] }, items: { root: ["select"] } },
      selections: { range: { prop: "range", choices: ["all", "month", "year"] } },
      select: { prop: "selected_point", value: { field: "at" } },
    },
    common.extend({ samples: z.array(z.unknown()), range: z.string() }),
  ),
  Dividends: definition("Dividends", {
    ...dividendsLedger,
    items: { key: "distributions", parts: ["receive", "void"] },
    actions: { items: { receive: ["press"], void: ["press"] } },
    confirmParts: ["void"],
  }),
  InvestmentActivity: definition("InvestmentActivity", {
    ...activityLedger,
    items: { key: "entries", parts: ["void"] },
    actions: { items: { void: ["press"] } },
    confirmParts: ["void"],
  }),
};
const data = { [portfolioKind]: [statement] };
const screen = (c: keyof typeof defs, extra = {}): ScreenLike => ({
  id: c.toLowerCase(),
  components: [{ id: "record", c, portfolioId: statement.portfolioId, ...extra }],
});
const press = (address: string) => ({ address, action: "press" });
const journalKey = "$record:investment_portfolios:education";

it("renders code-owned holdings, activity and sample amounts through readScreen", () => {
  const p = screen("Performance", {
    range: "all",
    samples: [
      { at: date(1), quotes: [] },
      { at: date(2), quotes: [] },
      { at: date(3), quotes: [{ assetId: "fund", price: 90 }] },
    ],
  });
  expect(readScreen(screen("Holdings"), defs, {}, "en", data)).toContain("units 10, value 900");
  const modelRead = readScreen(p, defs, {}, "en", data);
  expect(modelRead).toContain("value unknown, contributed 1000, gain unknown");
  expect(modelRead).toContain("value 1100, contributed 1000, gain 100");
  expect(
    planAct(p, defs, {}, [{ address: "record/r3", action: "select" }], null, "planner", data, now),
  ).toMatchObject({ ok: true, values: { "performance/record/r3": date(3) } });
  const controller = createScreenController({ screen: p, defs, deviceData: data, now: () => now });
  expect(controller.act({ address: "record/r3", action: "select" }).ok).toBe(true);
  expect(controller.read()).toContain("value 1100, contributed 1000, gain 100");
  expect(controller.snapshotScreen().components[0]).not.toHaveProperty("selected_point");
  controller.dispose();
  expect(readScreen(screen("Holdings"), defs)).toContain("Holdings (error)");
});

it("plans one record operation, disallows action values and rejects the whole invalid batch", () => {
  const d = screen("Dividends");
  const receive = press("record/r1/receive");
  const values = {};
  const perform = (...steps: ReturnType<typeof press>[]) =>
    planAct(d, defs, values, steps, null, "planner", data, now);
  expect(perform(receive, receive)).toMatchObject({ ok: false, at: 1, code: "not_actionable" });
  expect(values).toEqual({});
  expect(perform({ ...receive, ...{ value: "income" } })).toMatchObject({ ok: false, code: "invalid_value" });
  const applied = perform(receive);
  expect(applied).toMatchObject({
    ok: true,
    values: { [journalKey]: [{ kind: "receive", id: "income", revision: 1 }] },
    links: [],
  });
  if (!applied.ok) throw new Error("Expected an applied receipt");
  expect(Object.keys(applied.values)).toEqual([journalKey]);
  expect(readScreen(screen("InvestmentActivity"), defs, applied.values, "en", data)).toContain(
    "dividend: cash movement 8",
  );
  expect(planAct(d, defs, {}, [receive], null, "planner", data, Date.parse(date(4)))).toMatchObject({
    ok: false,
    code: "not_actionable",
  });
});

it("shares the journal across mounted and standalone screens and only reverses after confirmation", () => {
  const store = createInteractionStore();
  const controller = createScreenController({
    screen: screen("Dividends"),
    defs,
    store,
    deviceData: data,
    now: () => now,
  });
  const agent = createAgentAccess({
    defs,
    store,
    deviceData: data,
    current: () => screen("InvestmentActivity"),
  });
  expect(controller.act(press("record/r1/receive"), { dryRun: true }).ok).toBe(true);
  expect(store.get(journalKey)).toBeUndefined();
  expect(controller.press("record/r1/receive").ok).toBe(true);
  expect(agent.read()).toContain("dividend: cash movement 8");
  expect(controller.press("record/r1/void").ok).toBe(true);
  expect(controller.read()).toContain("[confirm/confirm press]");
  expect(store.get(journalKey)).toHaveLength(1);
  expect(controller.press("confirm/confirm").ok).toBe(true);
  expect(store.get(journalKey)).toHaveLength(2);
  expect(agent.read()).toContain("dividend: cash movement 8 (voided)");
  expect(controller.press("record/r1/void").ok).toBe(false);
  controller.dispose();
});

it("does not allow a confirmed standalone press to void a different host record after reorder", () => {
  const store = createInteractionStore();
  const current = () => screen("InvestmentActivity");
  const options = { defs, store, current };
  const first = createAgentAccess({ ...options, deviceData: data });
  expect(first.act(press("record/r2/void")).ok).toBe(true);
  expect(first.read()).toContain("[confirm/confirm press]");
  const extra = { id: "small_deposit", at: date(3), kind: "deposit", amount: 5 };
  const moved = {
    ...statement,
    entries: [...statement.entries.slice(0, 1), extra, ...statement.entries.slice(1)],
  };
  const second = createAgentAccess({ ...options, deviceData: { [portfolioKind]: [moved] } });
  expect(second.act(press("confirm/confirm"))).toMatchObject({
    ok: false,
    code: "invalid_value",
    hint: "The record changed after confirmation opened",
  });
  expect(store.get(journalKey)).toBeUndefined();
});

it("uses parsed defaults to bind a confirmed standalone receipt reversal", () => {
  const store = createInteractionStore();
  const current = () => screen("Dividends", { portfolioId: undefined });
  const agent = createAgentAccess({ defs, store, current, deviceData: data });
  expect(agent.act(press("record/r1/receive")).ok).toBe(true);
  expect(agent.read()).toContain("[record/r1/void press]");
  expect(agent.act(press("record/r1/void")).ok).toBe(true);
  expect(agent.read()).toContain("[confirm/confirm press]");
  expect(store.get(journalKey)).toHaveLength(1);
  expect(agent.act(press("confirm/confirm")).ok).toBe(true);
  expect(store.get(journalKey)).toHaveLength(2);
});

it("does not reverse a replacement host receipt with the same revision", () => {
  const store = createInteractionStore();
  const current = () => screen("Dividends");
  const open = (receivedAt: string) =>
    createAgentAccess({
      defs,
      store,
      current,
      deviceData: {
        [portfolioKind]: [
          {
            ...statement,
            distributions: [{ ...statement.distributions[0]!, receivedAt }],
          },
        ],
      },
    });
  expect(open(date(5)).act(press("record/r1/void")).ok).toBe(true);
  expect(open(date(6)).act(press("confirm/confirm"))).toMatchObject({
    ok: false,
    hint: "The record changed after confirmation opened",
  });
  expect(store.get(journalKey)).toBeUndefined();
});

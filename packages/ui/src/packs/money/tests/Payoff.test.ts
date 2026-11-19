import { describe, expect, expectTypeOf, it } from "vitest";
import {
  components,
  emptyLine,
  createRegistry,
  packReady,
  planAct,
  readComponent,
  readScreen,
  type CastLike,
  type Props,
  type ScreenLike,
  type ThemeChoice,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { elementAt, renderInstance } from "../../../../test/render";
import { moneyWordsFor } from "../lang";

const def = components.Payoff;
const { props, meta, examples, fallback, probes } = def;
const example = examples[0]!;
const debt = example.debts[0]!;
const defs = { Payoff: def };
const screen: ScreenLike = { id: "home", components: [{ id: "p1", c: "Payoff", ...example }] };
const theme: ThemeChoice = { preset: "calm", mode: "light", accent: "moss" };
const words = moneyWordsFor().payoff;
const strategyCodes = words.strategyCodes("high_rate", "small_balance");
const hasPart = (html: string, part: string) => html.includes(`data-testid="home/c1/${part}"`);

describe("Payoff schema", () => {
  it.each(examples)("accepts the domain examples", (value) =>
    expect(props.safeParse(value).success).toBe(true),
  );
  it("bounds debts and records and defaults the planner options", () => {
    const debts = Array(6).fill({ ...debt, payments: Array(6).fill(debt.payments[0]) });
    expect(props.parse({ debts })).toMatchObject({ extra: 0, strategy: "high_rate", style: "plan" });
    type View = Props<typeof props, typeof meta>;
    expectTypeOf<View["debts"][number]["id"]>().toEqualTypeOf<string>();
  });
  it.each([
    {},
    { debts: [] },
    { debts: Array(7).fill(debt) },
    ...[
      { name: "x".repeat(25) },
      { principal: 0 },
      { rate: 101 },
      { payment: 0 },
      { firstDue: "2026-11-31" },
      { payments: Array(7).fill(debt.payments[0]) },
      { payments: [{ due: debt.firstDue, amount: 0 }] },
      { balance: 50 },
      { id: "r1" },
    ].map((patch) => ({ debts: [{ ...debt, ...patch }] })),
    ...[
      { extra: -1 },
      { extra: Infinity },
      { extra: "50" },
      { strategy: "random" },
      { style: "wide" },
      { goto: "Bad ID" },
      { currency: "USD" },
      { total: 100 },
      { color: "red" },
      { pixels: 4 },
    ].map((patch) => ({ ...example, ...patch })),
  ])("rejects invalid or presentation input", (value) => expect(props.safeParse(value).success).toBe(false));
});

describe("Payoff fallback and metadata", () => {
  it("uses cast titles and neutral placeholders", () => {
    const empty: CastLike = { things: [], items: [] };
    const matching: CastLike = {
      things: [{ type: "loan", fields: ["name"] }],
      items: [{ id: "loan", type: "loan", sample: true, name: "Reserve loan" }],
    };
    const malformed = { ...matching, items: [{ ...matching.items[0]!, name: 4 }] };
    for (const cast of [empty, matching, malformed])
      expect(props.safeParse(fallback({ cast })).success).toBe(true);
    expect(fallback({ cast: empty }).debts[0]?.name).toBe("Item one");
    expect(fallback({ cast: matching }).debts[0]?.name).toBe("Reserve loan");
    expect(fallback({ cast: malformed }).debts[0]?.name).toBe("Item one");
  });
  it("keeps the tier, pack boundary and core-first probes", () => {
    expect(meta.tier).toBe("phone");
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta).not.toHaveProperty("confirmParts");
    expect(createRegistry({ packs: ["money"] }).ids.includes("Payoff")).toBe(packReady("money"));
    expect(probes.filter(({ kind }) => kind === "choose").map(({ expect }) => expect)).toContain("Progress");
    expect(probes.find(({ kind }) => kind === "write")).toMatchObject({ expect: "Payoff" });
    expect(probes.find(({ kind }) => kind === "read")).toMatchObject({
      expect: { address: "p1/strategy", action: "select" },
    });
  });
});

describe("Payoff states and parts", () => {
  it("draws strategy and extra at stable addresses, and preserves item ids when sorted", () => {
    const html = renderInstance("Payoff", { ...example, strategy: "small_balance" }, "filled", theme);
    for (const part of meta.parts.filter((part) => part !== "empty" && part !== "sub"))
      expect(hasPart(html, part)).toBe(true);
    for (const item of ["r1", "r2"])
      for (const part of meta.items.parts) expect(hasPart(html, `${item}/${part}`)).toBe(true);
    expect(elementAt(html, "home/c1/strategy").attributes).toContain('role="radiogroup"');
    expect(html).toContain(strategyCodes);
    expect(elementAt(html, "home/c1/extra").attributes).toContain('role="spinbutton"');
    expect(elementAt(html, "home/c1/edit").attributes).toContain('role="button"');
  });
  it("hides the plot and unlinked editor in compact, without hiding rows or controls", () => {
    const html = renderInstance("Payoff", examples[1]!, "filled", theme);
    for (const part of ["line", "edit"]) expect(hasPart(html, part)).toBe(false);
    for (const part of ["r1/name", "r2/clearance", "strategy", "extra"])
      expect(hasPart(html, part)).toBe(true);
  });
  it.each([
    ["empty", emptyLine(undefined)],
    ["success", words.cleared],
  ] as const)("shows a meaningful %s state without controls", (state, text) => {
    const html = renderInstance("Payoff", example, state, theme);
    expect(html).toContain(text);
    expect(hasPart(html, "strategy")).toBe(false);
    if (state === "empty") {
      expect(html).toContain(words.emptyHelp);
      expect(hasPart(html, "sub")).toBe(true);
    }
  });
  it("shows the error with context and offers no actions in a host-forced error state", () => {
    const html = renderInstance("Payoff", example, "error", theme);
    expect(html).toContain(words.unavailable);
    expect(html).toContain(words.errorHelp);
    for (const part of ["total", "budget", "line", "strategy", "extra", "edit"]) {
      expect(hasPart(html, part)).toBe(false);
    }
    expect(readComponent(def, example, "p1", "error")).toEqual(["p1 Payoff (error)"]);
  });
  it("shows a geometry-preserving loading state without readings or controls", () => {
    const html = renderInstance("Payoff", example, "loading", theme);
    expect(hasPart(html, "root")).toBe(true);
    expect(html).toContain('aria-busy="true"');
    for (const part of ["total", "extra", "r1/name"]) expect(hasPart(html, part)).toBe(false);
    expect(html).not.toMatch(/role="(radio|spinbutton|button)"/);
    expect(readComponent(def, example, "p1", "loading")).toEqual(["p1 Payoff (loading)"]);
  });
});

describe("Payoff read and act", () => {
  it("lets the user recover from a calculated budget shortfall", () => {
    const input = { debts: [{ ...debt, principal: 100, rate: 12, payment: 1, payments: [] }] };
    const stalled = { ...screen, components: [{ id: "p1", c: "Payoff", ...input }] };
    expect(readScreen(stalled, defs)).toContain(words.noFinish);
    const result = planAct(stalled, defs, {}, [{ address: "p1/extra", action: "set", value: 25 }]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(readScreen(stalled, defs, result.values)).not.toContain(words.noFinish);
  });
  it("projects both choices and the extra amount into the recalculated reading", () => {
    const controller = createScreenController({ screen, defs });
    try {
      for (const value of ["small_balance", "high_rate"] as const)
        expect(controller.act({ address: "p1/strategy", action: "select", value })).toMatchObject({
          ok: true,
        });
      expect(controller.act({ address: "p1/extra", action: "set", value: 100 })).toMatchObject({ ok: true });
      const reading = readScreen(screen, defs, controller.store.snapshot("home"));
      expect(reading).toContain("$1,300 monthly budget");
      expect(reading).toContain(strategyCodes);
      expect(reading).toContain('[p1/strategy select = "high_rate"; choices ["high_rate","small_balance"]]');
      expect(reading).toContain("[p1/extra set = 100]");
      expect(screen.components[0]).toMatchObject(example);
    } finally {
      controller.dispose();
    }
  });
  it("rejects unsupported or absent actions and invalid values", () => {
    for (const [part, action, value] of [
      ["strategy", "select", undefined],
      ["strategy", "select", "highest"],
      ["extra", "set", -1],
      ["extra", "set", "50"],
      ["extra", "set", Infinity],
    ] as const)
      expect(planAct(screen, defs, {}, [{ address: `p1/${part}`, action, value }])).toMatchObject({
        ok: false,
        code: "invalid_value",
      });
    const unlinked = { ...screen, components: [{ id: "p1", c: "Payoff", ...examples[1]! }] };
    expect(planAct(unlinked, defs, {}, [{ address: "p1/edit", action: "press" }])).toMatchObject({
      ok: false,
      code: "not_actionable",
    });
    expect(planAct(screen, defs, {}, [{ address: "p1/edit", action: "press" }])).toMatchObject({
      ok: true,
      links: [{ goto: "debts", address: "home/p1/edit" }],
    });
  });
});

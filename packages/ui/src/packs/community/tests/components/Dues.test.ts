import { describe, expect, it, vi } from "vitest";
import { components, createRegistry, packReady, readComponent } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";
import { duesProjection } from "../../copy";

const def = components.Dues;
const { props, meta, examples, fallback, probes } = def;
const input = examples[0]!;
const member = examples[1]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const draw = (value: unknown, state: "filled" | "empty" | "loading" | "success" | "error" = "filled") =>
  renderInstance("Dues", value, state, theme, { component: "d1" });
const address = (part: string) => `home/d1/${part}`;

describe("Dues schema and fallback", () => {
  it.each(examples)("accepts real examples", (row) => expect(props.safeParse(row).success).toBe(true));
  it("accepts maximum counts and rejects invalid money, references and host fields", () => {
    const row = input.assessments[0]!;
    const receipt = input.receipts[0]!;
    const assessments = Array.from({ length: 30 }, (_, i) => ({ ...row, id: `m_${i}` }));
    const receipts = Array.from({ length: 60 }, (_, i) => ({
      ...receipt,
      id: `r_${i}`,
      assessmentId: "m_0",
    }));
    expect(props.safeParse({ ...input, assessments, receipts }).success).toBe(true);
    for (const patch of [
      { assessments: [] },
      { assessments: [...assessments, row] },
      { assessments: [{ ...row, amount: -1 }] },
      { receipts: [...receipts, receipt] },
      { receipts: [{ ...receipt, amount: 0 }] },
      { receipts: [{ ...receipt, assessmentId: "missing" }] },
      { style: "member" },
      { can_pay: true },
      { collected: 12 },
      { color: "#fff" },
    ])
      expect(props.safeParse({ ...input, ...patch }).success).toBe(false);
  });
  it("uses a cast period and remains valid with an empty or malformed cast", () => {
    const empty = { things: [], items: [] };
    const cast = (name: string | number) => ({
      things: [{ type: "period", fields: ["name"] }],
      items: [{ id: "year", type: "period", sample: true, name }],
    });
    for (const value of [empty, cast("Annual dues"), cast(42)])
      expect(props.safeParse(fallback({ cast: value })).success).toBe(true);
    expect(fallback({ cast: empty }).period).toBe("Item one");
    expect(fallback({ cast: cast("Annual dues") }).period).toBe("Annual dues");
    expect(meta).toMatchObject({
      dense: true,
      confirmParts: ["void"],
      partTiers: { remind: "service", pay: "service" },
    });
    expect(createRegistry({ packs: ["community"] }).ids.includes("Dues")).toBe(packReady("community"));
    expect(probes).toContainEqual(expect.objectContaining({ kind: "choose", expect: "Amount" }));
  });
});

describe("Dues parts and states", () => {
  it("draws reconciled totals, distinct receipts and only ledger controls", () => {
    const parts = addressedElements(draw(input));
    for (const id of ["period", "assessed", "collected", "outstanding", "r1/record", "r3/void", "r4/voided"])
      expect(parts.has(address(id)), id).toBe(true);
    for (const id of ["r1/pay", "r1/remind", "r4/void"]) expect(parts.has(address(id)), id).toBe(false);
    const reading = readComponent(def, input, "d1").join("\n");
    expect(reading).toContain("Ana · Receipt 1");
    expect(reading).toContain("[d1/r3/void press]");
    expect(reading).not.toMatch(/r4\/void press|\/pay press/);
    expect([
      ...addressedElements(draw({ ...input, density: "compact", surface: "outlined" })).keys(),
    ]).toEqual([...parts.keys()]);
    expect(draw(member)).not.toContain('role="button"');
  });
  it.each([
    ["empty", "Nothing here yet"],
    ["success", "Receipt recorded"],
    ["error", "Could not save the payment"],
    ["loading", 'aria-busy="true"'],
  ] as const)("draws the %s state without controls", (state, text) => {
    const html = draw(input, state);
    expect(html).toContain(text);
    expect(html).not.toContain('role="button"');
  });
});

describe("Dues actions", () => {
  it("confirms active receipts only, and never fires a denied service", () => {
    const onAction = vi.fn();
    const screen = { id: "home", components: [{ ...input, c: "Dues", id: "d1" }] };
    const runtime = createScreenController({ screen, defs: { Dues: def }, onAction });
    try {
      expect(runtime.press("d1/r1/record").ok).toBe(true);
      expect(runtime.press("d1/r1/remind").ok).toBe(false);
      expect(runtime.press("d1/r4/void").ok).toBe(false);
      onAction.mockClear();
      expect(runtime.press("d1/r3/void").ok).toBe(true);
      expect(runtime.confirmation).toBeDefined();
      expect(onAction).not.toHaveBeenCalled();
      expect(runtime.press("confirm/confirm").ok).toBe(true);
      expect(onAction).toHaveBeenCalledWith({ address: address("r3/void"), action: "press" });
    } finally {
      runtime.dispose();
    }
  });
  it("only offers payment for the signed-in member's outstanding assessments and never mutates them", () => {
    const screen = { id: "home", components: [{ ...member, receipts: [], c: "Dues", id: "d1" }] };
    for (const memberId of ["jo", "ana"]) {
      const derive = duesProjection(() => ({
        treasurer: false,
        today: "2026-11-21",
        memberId,
        payments: true,
      }));
      const Dues = { ...def, meta: { ...meta, live: { derive } } };
      const runtime = createScreenController({ screen, defs: { Dues } });
      try {
        expect(runtime.press("d1/r1/pay").ok).toBe(memberId === "jo");
        expect(runtime.press("d1/r1/record").ok).toBe(false);
        expect(runtime.snapshotScreen().components[0]?.receipts).toEqual([]);
      } finally {
        runtime.dispose();
      }
    }
  });
});

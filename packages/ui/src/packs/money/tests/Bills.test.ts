import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  components,
  createRegistry,
  emptyLine,
  packReady,
  readComponent,
  type CastLike,
  type Props,
  type ScreenLike,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { elementAt, renderInstance } from "../../../../test/render";

const { props, meta, fallback, examples, probes } = components.Bills;
const bill = { name: "Power", amount: 18.5, due: "2026-11-18", paid: false, repeat: "monthly", icon: "zap" };
const input = {
  bills: [{ ...bill, due: undefined, name: "Phone", paid: true }, bill],
} as const;
const sample = { bills: [...input.bills] };
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const screen: ScreenLike = { id: "home", components: [{ id: "b1", c: "Bills", ...sample }] };
const part = (suffix: string) => `home/b1/${suffix}`;
const render = (state: "filled" | "empty") =>
  renderInstance("Bills", sample, state, theme, { component: "b1" });

beforeEach(() => vi.setSystemTime(new Date(2026, 10, 19, 12)));
afterEach(() => vi.useRealTimers());

describe("Bills contract and boundaries", () => {
  it.each(examples)("accepts a real example", (example) => {
    expect(props.safeParse(example).success).toBe(true);
  });

  it("defaults to due, trims text and accepts six 24-character names", () => {
    expect(props.parse({ bills: [{ ...bill, name: "  Power  " }] })).toEqual({ bills: [bill], style: "due" });
    expect(props.parse({ bills: Array(6).fill({ ...bill, name: "x".repeat(24) }) }).bills).toHaveLength(6);
    expectTypeOf<Props<typeof props, typeof meta>["bills"][number]["id"]>().toBeString();
  });

  it.each([
    {},
    { bills: [] },
    { bills: Array(7).fill(bill) },
    { bills: [bill], style: "compact" },
    { bills: [bill], total: 10 },
    { bills: [bill], color: "red" },
    ...[
      { id: "r1" },
      { name: "" },
      { name: "x".repeat(25) },
      { due: "2026-02-29" },
      { repeat: "daily" },
      { icon: "unknown" },
      { paid: "yes" },
      { amount: -1 },
      { amount: "5" },
      { amount: Infinity },
      { amount: 1e9 },
      { currency: "USD" },
      { overdue: true },
    ].map((patch) => ({ bills: [{ ...bill, ...patch }] })),
  ])("rejects invalid, computed and unknown input", (invalid) => {
    expect(props.safeParse(invalid).success).toBe(false);
  });

  it("retains the phone tier and core-first choose, write and read probes", () => {
    expect(meta.tier).toBe("phone");
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "Bills" }),
        expect.objectContaining({ kind: "choose", expect: "Checklist" }),
        expect.objectContaining({ kind: "write", expect: "Bills" }),
        expect.objectContaining({ kind: "read", expect: { address: "b1/r1/paid", action: "check" } }),
      ]),
    );
    expect(createRegistry({ packs: ["money"] }).ids.includes("Bills")).toBe(packReady("money"));
  });
});

describe("Bills fallback", () => {
  it("uses bounded cast titles and neutral placeholders for unusable content", () => {
    const casts: CastLike[] = [
      { things: [], items: [] },
      {
        things: [{ type: "entry", fields: ["name"] }],
        items: Array.from({ length: 8 }, (_, i) => ({
          id: `entry_${i}`,
          type: "entry",
          sample: true,
          name: i ? "x".repeat(30) : "Power",
        })),
      },
      { things: [], items: [{ id: "entry", type: "entry", sample: false, name: 4 }] },
    ];
    const [empty, full, malformed] = casts.map((cast) => props.parse(fallback({ cast })));
    expect(empty?.bills).toEqual([
      { name: "Item one", amount: 0, repeat: "never", paid: false, icon: "dot" },
    ]);
    expect(full?.bills.map(({ name }) => name)).toEqual(["Power", "x".repeat(24), "x".repeat(24)]);
    expect(malformed).toEqual(empty);
  });
});

describe("Bills states and parts", () => {
  it("renders declared parts, stable item addresses and sibling pointer targets", () => {
    const html = render("filled");
    for (const p of meta.items.parts) expect(elementAt(html, part(`r2/${p}`))).toBeDefined();
    const root = elementAt(html, part("r2/root"));
    const paid = elementAt(html, part("r2/paid"));
    expect(root.attributes).toContain('role="button"');
    expect(root.attributes).toContain("Power, overdue");
    expect(root.children).not.toContainEqual(paid);
    expect(paid.attributes).toContain('role="checkbox"');
    expect(paid.attributes).toContain('aria-checked="false"');
    expect(elementAt(html, part("r1/paid")).attributes).toContain('aria-checked="true"');
    expect(html.indexOf(part("r2/root"))).toBeLessThan(html.indexOf(part("r1/root")));
    expect(html).not.toContain(part("r1/due"));
    expect(elementAt(html, part("total"))).toBeDefined();
  });

  it("draws the empty message instead of totals, bill rows or actions", () => {
    const html = render("empty");
    expect(elementAt(html, part("root"))).toBeDefined();
    expect(elementAt(html, part("empty"))).toBeDefined();
    expect(html).toContain(emptyLine());
    expect(html).not.toContain(part("r2/"));
    expect(html).not.toContain(part("total"));
    const empty = { id: "b1", c: "Bills", state: "empty", ...sample } as const;
    const controller = createScreenController({
      screen: { id: "home", components: [empty] },
      defs: components,
    });
    expect(controller.press(part("r2/root"))).toMatchObject({ ok: false, code: "not_actionable" });
    expect(controller.press(part("r2/paid"))).toMatchObject({ ok: false, code: "not_actionable" });
  });
});

describe("Bills read and act", () => {
  it("reads computed copy and forwards a press without making a payment or navigating", () => {
    const onAction = vi.fn(),
      onLink = vi.fn();
    const controller = createScreenController({ screen, defs: components, onAction, onLink });
    expect(controller.read()).toContain("Power — $18.50 — Due 18 Nov 2026 — Every month");
    expect(controller.read()).toContain("Monthly estimate — $37");
    expect(controller.read()).toContain("[b1/r2 press]");
    expect(controller.press(part("r2/root"))).toMatchObject({ ok: true });
    expect(onAction).toHaveBeenCalledExactlyOnceWith({ address: "home/b1/r2", action: "press" });
    expect(onLink).not.toHaveBeenCalled();
  });

  it("updates the paid flag reversibly without a confirmation and rejects wrong actions or values", () => {
    const controller = createScreenController({ screen, defs: components });
    const address = part("r2/paid");
    expect(controller.read()).toContain("[b1/r2/paid check:todo]");
    expect(controller.press(address)).toMatchObject({ ok: true });
    expect(controller.read()).toContain("[b1/r2/paid check:done]");
    expect(controller.act({ address, action: "check", value: false })).toMatchObject({ ok: true });
    expect(controller.read()).toContain("[b1/r2/paid check:todo]");
    expect(controller.act({ address, action: "check", value: "yes" })).toMatchObject({
      ok: false,
      code: "invalid_value",
    });
    expect(controller.act({ address: part("r2/due"), action: "press" })).toMatchObject({
      ok: false,
      code: "not_actionable",
    });
    expect(readComponent(components.Bills, sample, "b1", "empty")).toEqual(["b1 Bills (empty)"]);
  });
});

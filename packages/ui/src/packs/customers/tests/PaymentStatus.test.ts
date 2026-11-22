import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  packReady,
  readComponent,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { elementAt, renderInstance } from "../../../../test/render";
import { paymentToday } from "../copy";
const { props, meta, examples, fallback, probes } = components.PaymentStatus;
const base = { amount: 60, date: "2026-11-18" };
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
describe("PaymentStatus schema and boundaries", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("trims text and derives action presence", () => {
    expect(props.parse({ ...base, method: "  Bank transfer  " })).toEqual({
      ...base,
      method: "Bank transfer",
      detail: "full",
      installments: [],
      outstanding: true,
    });
    expectTypeOf<Props<typeof props, typeof meta>>().not.toBeAny();
    expectTypeOf<Props<typeof props, typeof meta>>().not.toHaveProperty("color");
  });
  it.each([
    { amount: -1 },
    { amount: Infinity },
    { amount: NaN },
    { paid: -1 },
    { paid: Infinity },
    { paid: "20" },
    { date: "2026-02-29" },
    { date: "18 Nov 2026" },
    { due: "2026-13-01" },
    { method: "" },
    { method: "   " },
    { method: "a".repeat(17) },
    { status: "paid" },
    { balance: 20 },
    { currency: "EUR" },
    { color: "#ffffff" },
    { pixels: 8 },
    { outstanding: false },
  ])("rejects invalid, computed and unknown input", (invalid) =>
    expect(props.safeParse({ ...base, ...invalid }).success).toBe(false),
  );
  it("accepts exact boundaries and rejects missing required props", () => {
    for (const input of [{}, { amount: 0 }, { date: base.date }])
      expect(props.safeParse(input).success).toBe(false);
    const boundary = { date: "2024-02-29", due: "9999-12-31", method: "a".repeat(16) };
    for (const amount of [0, Number.MIN_VALUE, Number.MAX_VALUE])
      for (const paid of [undefined, 0, Number.MAX_VALUE])
        expect(props.safeParse({ ...boundary, amount, paid }).success).toBe(true);
  });
});
describe("PaymentStatus fallback and metadata", () => {
  const seed = { id: "one", type: "record", sample: true };
  const fields = ["cost", "date", "due"];
  const casts: CastLike[] = [
    { things: [], items: [] },
    {
      things: [{ type: "record", fields }],
      items: [{ ...seed, cost: 60, date: base.date, due: "2026-12-02" }],
    },
    { things: [], items: [{ ...seed, cost: Infinity, date: "2026-02-29" }] },
    {
      things: [{ type: "record", fields: ["name"] }],
      items: [{ ...seed, name: "a".repeat(80), ignored: 25 }],
    },
  ];
  it.each(casts)("validates empty, matching, malformed and overlong casts", (cast) =>
    expect(props.safeParse(fallback({ cast })).success).toBe(true),
  );
  it("uses cast values or shared neutral defaults", () => {
    expect(fallback({ cast: casts[0]! })).toEqual({ amount: 0, date: paymentToday() });
    expect(fallback({ cast: casts[1]! })).toEqual({ amount: 60, date: base.date, due: "2026-12-02" });
    expect(fallback({ cast: casts[2]! }).amount).toBe(0);
    expect(fallback({ cast: casts[3]! }).amount).toBe(0);
  });
  it("keeps metadata, probes and the pack gate", () => {
    expect(meta).toMatchObject({ status: "ready", tier: "phone" });
    expect(meta.partTiers.remind).toBe("service");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(meta.realPath).not.toBe("");
    expect(meta.pick).toContain("Amount");
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "Amount")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "PaymentStatus" });
    expect(probes.filter((probe) => probe.kind === "read")).toHaveLength(2);
    expect(createRegistry({ packs: ["customers"] }).ids.includes(meta.id)).toBe(packReady("customers"));
    expect(createRegistry({ packs: ["customers"], includeDrafts: true }).ids).toContain("PaymentStatus");
  });
});
describe("PaymentStatus states, parts and reading", () => {
  it.each([
    [{ ...base }, "Due", true],
    [{ ...base, paid: 20, due: "9999-12-31" }, "Part paid", true],
    [{ ...base, paid: 20, due: "2020-01-01" }, "Overdue", true],
    [{ ...base, paid: 60 }, "Paid", false],
    [{ ...base, paid: 80, due: "2020-01-01" }, "Paid", false],
    [{ amount: 0, date: base.date }, "Paid", false],
  ] as const)("draws status and conditional actions", (input, status, actionable) => {
    const html = renderInstance("PaymentStatus", input, "filled", theme);
    const offered = affordancesOf(meta, props.parse(input), "p1");
    expect(offered.map((action) => action.part)).toEqual(actionable ? ["mark", "remind"] : []);
    for (const part of ["root", "status", "amount", "date"]) expect(html).toContain(`home/c1/${part}`);
    for (const action of offered)
      expect(elementAt(html, `home/c1/${action.part}`).attributes).toContain('role="button"');
    expect(html.includes('data-testid="home/c1/mark"')).toBe(actionable);
    expect(html.includes('data-testid="home/c1/remind"')).toBe(actionable);
    const reading = readComponent(components.PaymentStatus, input, "p1").join("\n");
    expect(reading).toContain(status);
    expect(reading.includes("!needs-service")).toBe(actionable);
    expect(reading.includes("Mark as paid")).toBe(actionable);
    expect(reading.includes("Remind")).toBe(actionable);
    expect(reading).toContain("Date 18 Nov 2026");
  });
  it("shows each optional part, including zero paid, and omits absent details", () => {
    const minimal = renderInstance("PaymentStatus", base, "filled", theme);
    for (const part of ["paid", "due", "method"]) expect(minimal).not.toContain(`home/c1/${part}`);
    const input = { ...base, paid: 0, due: "9999-12-31", method: "Bank transfer" };
    const html = renderInstance("PaymentStatus", input, "filled", theme);
    const reading = readComponent(components.PaymentStatus, input, "p1").join("\n");
    for (const part of ["root", "status", "amount", "paid", "date", "due", "method", "mark", "remind"])
      expect(html).toContain(`home/c1/${part}`);
    expect(html).not.toContain("home/c1/confirmation");
    expect(html).toContain(">Total<");
    expect(html).toContain(">$60<");
    expect(reading).toContain("Total $60");
    for (const text of ["Received $0", "Due 31 Dec 9999", "Bank transfer"]) {
      expect(html).toContain(text);
      expect(reading).toContain(text);
    }
  });
  it("keeps the recorded settlement in success", () => {
    for (const input of [base, { ...base, paid: 60 }]) {
      const html = renderInstance("PaymentStatus", input, "success", theme);
      expect(html).toContain(input === base ? "Due" : "Paid");
      expect(html).toContain("Update complete");
      expect(html).toContain("home/c1/confirmation");
      for (const part of ["mark", "remind"]) expect(html).not.toContain(`home/c1/${part}`);
      expect(readComponent(components.PaymentStatus, input, "p1", "success")).toHaveLength(1);
    }
  });
  it("keeps extreme amounts compact on screen and exact in the reading", () => {
    const input = { ...base, amount: Number.MAX_VALUE, paid: Number.MAX_VALUE };
    expect(renderInstance("PaymentStatus", input, "filled", theme)).toContain("$1.8E308");
    const reading = readComponent(components.PaymentStatus, input, "p1").join("\n");
    expect(reading).toContain(String(Number.MAX_VALUE));
  });
});
describe("PaymentStatus mark and remind actions", () => {
  it("dispatches without navigation or destructive confirmation", () => {
    const onAction = vi.fn();
    const runtime = createScreenController({
      screen: { id: "home", components: [{ id: "p1", c: "PaymentStatus", ...base }] },
      defs: components,
      onAction,
    });
    for (const part of ["mark", "remind"]) {
      expect(runtime.press(`p1/${part}`)).toMatchObject({ ok: true });
      expect(onAction).toHaveBeenLastCalledWith({ address: `home/p1/${part}`, action: "press" });
      expect(runtime.confirmation).toBeUndefined();
    }
    runtime.dispose();
  });
  it("rejects settled and non-filled payment actions", () => {
    const inactive = [
      { ...base, paid: 60 },
      { ...base, state: "success" as const },
    ];
    for (const input of inactive) {
      const onAction = vi.fn();
      const runtime = createScreenController({
        screen: { id: "home", components: [{ id: "p1", c: "PaymentStatus", ...input }] },
        defs: components,
        onAction,
      });
      for (const part of ["mark", "remind"]) expect(runtime.press(`p1/${part}`)).toMatchObject({ ok: false });
      expect(onAction).not.toHaveBeenCalled();
      runtime.dispose();
    }
  });
});

import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  components,
  createRegistry,
  packReady,
  readComponent,
  type CastLike,
  type Props,
  type StateName,
} from "@lmthing/ui/catalog";
import { createInteractionStore, createScreenController } from "@lmthing/ui/kit";
import { addressedElements, renderInstance } from "../../../../../test/render";

const def = components.RentRoll;
const { props, meta, examples, fallback, probes } = def;
const ledger = examples[0]!;
const outstanding = examples[1]!;
const charge = ledger.charges[0]!;
const receipt = ledger.receipts[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const markup = (input: unknown, state: StateName = "filled") =>
  renderInstance("RentRoll", input, state, theme, { thing: "walk" });
const parts = (input: unknown, state?: StateName) => addressedElements(markup(input, state));
const read = (input: unknown, state?: StateName) => readComponent(def, input, "c1", state).join("\n");

describe("RentRoll contract and bounds", () => {
  it.each(examples)("accepts each domain example", (example) => {
    expect(props.safeParse(example).success).toBe(true);
  });
  it("defaults to the full ledger and accepts its dense limits", () => {
    const charges = Array.from({ length: 24 }, (_, index) => ({
      ...charge,
      chargeRef: `charge_${index}`,
      letRef: "x".repeat(32),
      unit: "u".repeat(32),
      occupant: "o".repeat(24),
    }));
    const receipts = Array.from({ length: 48 }, (_, index) => ({
      ...receipt,
      receiptRef: `receipt_${index}`,
      chargeRef: "charge_0",
    }));
    expect(props.parse({ month: ledger.month, charges, receipts })).toMatchObject({
      style: "ledger",
      figures: "exact",
    });
    expect(props.safeParse({ ...ledger, charges: [...charges, charge] }).success).toBe(false);
    expect(props.safeParse({ ...ledger, charges, receipts: [...receipts, receipt] }).success).toBe(false);
  });
  it.each([
    { charges: [] },
    { charges: [charge, charge] },
    { charges: [{ ...charge, unit: "x".repeat(33) }] },
    { charges: [{ ...charge, occupant: "x".repeat(25) }] },
    { charges: [{ ...charge, letRef: "bad ref" }] },
    { charges: [{ ...charge, due: "2026-11-31" }] },
    { charges: [{ ...charge, amount: 0 }] },
    { charges: [{ ...charge, paid: 1 }] },
    { charges: [{ ...charge, id: "r1" }] },
    { receipts: [receipt, receipt] },
    { receipts: [{ ...receipt, amount: -1 }] },
    { receipts: [{ ...receipt, method: "unknown" }] },
    { receipts: [{ ...receipt, chargeRef: "other" }] },
    { month: "2026-13" },
    { style: "compact" },
    { figures: "long" },
    { density: "small" },
    { color: "red" },
    { totals: {} },
  ])("rejects invalid or code-owned fields: %j", (patch) => {
    expect(props.safeParse({ ...ledger, ...patch }).success).toBe(false);
  });
  it("gives view lines stable ids without accepting ids in written props", () => {
    expectTypeOf<Props<typeof props, typeof meta>["lines"][number]["id"]>().toEqualTypeOf<string>();
  });
});

describe("RentRoll fallback and probes", () => {
  it("uses a matching cast record and falls back to neutral placeholders", () => {
    const things = [{ type: "record", fields: ["label"] }];
    const casts: CastLike[] = [
      { things: [], items: [] },
      { things, items: [{ id: "one", type: "record", sample: true, label: "Workshop" }] },
      { things, items: [{ id: "bad", type: "record", sample: true, label: 42 }] },
    ];
    const samples = casts.map((cast) => fallback({ cast }));
    for (const sample of samples) expect(props.safeParse(sample).success).toBe(true);
    expect(samples.map(({ charges }) => charges[0]?.unit)).toEqual(["Item one", "Workshop", "Item one"]);
  });
  it("keeps the core-first and figures probes, tier and pack gate", () => {
    expect(meta).toMatchObject({
      status: "ready",
      tier: "phone",
      dense: true,
      partTiers: { remind: "service" },
    });
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(probes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "choose", expect: "RentRoll" }),
        expect.objectContaining({ kind: "choose", expect: "Amount" }),
        expect.objectContaining({ kind: "write", expect: "RentRoll" }),
        expect.objectContaining({ kind: "write", variant: { axis: "figures", value: "short" } }),
        expect.objectContaining({ kind: "read", expect: { address: "r1/r2/void", action: "press" } }),
      ]),
    );
    expect(createRegistry({ packs: ["property"] }).ids.includes("RentRoll")).toBe(packReady("property"));
  });
});

describe("RentRoll states and parts", () => {
  it.each([
    ["empty", "No walks yet"],
    ["loading", "Loading"],
    ["success", "Receipt recorded"],
    ["error", "Rent ledger update failed"],
  ] as const)("shows %s without offering ledger actions", (state, message) => {
    expect(markup(ledger, state)).toContain(message);
    expect([...parts(ledger, state).keys()]).not.toContain("home/c1/r1/record");
    expect(read(ledger, state)).not.toContain(" press");
  });
  it("draws all totals and distinguishes charge and receipt controls", () => {
    const shown = parts(ledger);
    for (const part of ["month", "assessed", "received", "outstanding", "arrears"])
      expect(shown.has(`home/c1/${part}`)).toBe(true);
    for (const part of ["root", "unit", "occupant", "due", "amount", "paid", "outstanding"])
      expect(shown.has(`home/c1/r1/${part}`)).toBe(true);
    for (const part of ["root", "unit", "date", "method", "amount"])
      expect(shown.has(`home/c1/r2/${part}`)).toBe(true);
    for (const target of ["r1/record", "r1/remind", "r2/void"])
      expect(shown.get(`home/c1/${target}`)?.attributes).toContain('role="button"');
    expect(parts(outstanding).has("home/c1/r2/voided")).toBe(true);
    expect(parts(outstanding).has("home/c1/r2/void")).toBe(false);
  });
  it("groups receipt dates with their unit before the amount and control", () => {
    const drawn = [...parts(ledger).keys()].filter((key) => key.startsWith("home/c1/r2/"));
    expect(drawn.slice(0, 6)).toEqual(
      ["root", "unit", "date", "method", "amount", "void"].map((part) => `home/c1/r2/${part}`),
    );
  });
  it("keeps partial payments and older arrears separate and excludes future charges", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    try {
      vi.setSystemTime(new Date("2026-11-10T12:00:00"));
      const input = {
        ...ledger,
        charges: [
          { ...charge, chargeRef: "future", due: "2026-12-01" },
          { ...charge, chargeRef: "old", due: "2026-10-01", amount: 140 },
          charge,
        ],
      };
      expect(read(input)).toContain("assessed $900 · received $600 · outstanding $300 · arrears $440");
      expect(read(input)).toContain("[c1/r4/void press]");
      expect(read(input)).not.toContain("[c1/r1/");
      expect(parts(input).has("home/c1/r4/void")).toBe(true);
      expect(parts(input).has("home/c1/r1/root")).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
  it("shows overpayment as credit and filters settled units only in outstanding style", () => {
    const paid = { ...ledger, receipts: [{ ...receipt, amount: 925 }] };
    expect(parts(paid).get("home/c1/r1/credit")?.text).toContain("$25");
    expect(parts(paid).has("home/c1/r1/record")).toBe(true);
    expect(parts(paid).has("home/c1/r1/remind")).toBe(false);
    const filtered = { ...paid, style: "outstanding" };
    expect(parts(filtered).has("home/c1/notice")).toBe(true);
    expect(parts(filtered).has("home/c1/r1/root")).toBe(false);
    expect(read(filtered)).not.toContain(" press");
  });
});

describe("RentRoll read and act", () => {
  it("opens the receipt form, exposes the reminder tier and confirms only an active receipt void", () => {
    const onAction = vi.fn();
    const controller = createScreenController({
      screen: { id: "home", components: [{ ...ledger, c: "RentRoll", id: "c1" }] },
      defs: { RentRoll: def },
      store: createInteractionStore(),
      onAction,
    });
    expect(controller.read()).toContain("[c1/r1/remind press !needs-service]");
    expect(controller.read()).toContain("[c1/r1/record press→property_rent_receipt]");
    expect(controller.press("c1/r1/record").ok).toBe(true);
    expect(controller.press("c1/r2/remind").ok).toBe(false);
    expect(controller.press("c1/r1/void").ok).toBe(false);
    expect(controller.press("c1/r1/remind").ok).toBe(true);
    expect(onAction).toHaveBeenCalledTimes(2);
    expect(controller.press("c1/r2/void").ok).toBe(true);
    expect(onAction).toHaveBeenCalledTimes(2);
    expect(controller.press("confirm/confirm").ok).toBe(true);
    expect(onAction).toHaveBeenCalledTimes(3);
  });
});

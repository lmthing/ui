import { describe, expect, expectTypeOf, it, vi } from "vitest";
import {
  affordancesOf,
  components,
  createRegistry,
  documentTotals,
  readComponent,
  stampItemIds,
  type CastLike,
  type Props,
} from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { elementAt, renderInstance } from "../../../../test/render";
const { props, meta, examples, fallback, probes } = components.Invoice;
const seed = examples[0]!;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
describe("Invoice schema and boundaries", () => {
  it.each(examples)("accepts a real example", (example) =>
    expect(props.safeParse(example).success).toBe(true),
  );
  it("defaults to an invoice and trims bounded text", () => {
    const { style: _style, ...input } = seed;
    expect(props.parse({ ...input, number: "  L-042  " })).toMatchObject({
      style: "invoice",
      number: "L-042",
    });
  });
  it.each([
    {},
    { ...seed, number: "" },
    { ...seed, to: " ".repeat(4) },
    { ...seed, number: "a".repeat(13) },
    { ...seed, to: "a".repeat(29) },
    { ...seed, note: "a".repeat(101) },
    { ...seed, lines: [] },
    { ...seed, lines: Array.from({ length: 9 }, () => seed.lines[0]) },
    { ...seed, lines: [{ item: "a".repeat(33), qty: 1, price: 0 }] },
    { ...seed, lines: [{ item: "", qty: 1, price: 0 }] },
    { ...seed, lines: [{ item: "Visit", qty: 0, price: 0 }] },
    { ...seed, lines: [{ item: "Visit", qty: -1, price: 0 }] },
    { ...seed, lines: [{ item: "Visit", qty: 1, price: -1 }] },
    { ...seed, lines: [{ item: "Visit", qty: Infinity, price: 0 }] },
    { ...seed, lines: [{ item: "Visit", qty: 1, price: NaN }] },
    { ...seed, lines: [{ item: "Visit", qty: 1, price: 0, id: "r1" }] },
    { ...seed, tax: -1 },
    { ...seed, tax: 101 },
    { ...seed, date: "2026-02-30" },
    { ...seed, due: "tomorrow" },
    { ...seed, status: "overdue" },
    { ...seed, style: "receipt" },
    { ...seed, style: "quote", status: "paid" },
    { ...seed, total: 77 },
    { ...seed, color: "#fff" },
  ])("rejects invalid input", (input) => expect(props.safeParse(input).success).toBe(false));
  it("accepts all exact text/count limits, fractional quantities, zero prices and both tax bounds", () => {
    const input = {
      ...seed,
      number: "a".repeat(12),
      to: "a".repeat(28),
      note: "a".repeat(100),
      lines: Array.from({ length: 8 }, () => ({ item: "a".repeat(32), qty: 0.5, price: 0 })),
    };
    for (const tax of [0, 100]) expect(props.safeParse({ ...input, tax }).success).toBe(true);
    type View = Props<typeof props, typeof meta>;
    expectTypeOf<View["lines"][number]["id"]>().toEqualTypeOf<string>();
    expectTypeOf<View>().not.toBeAny();
    expectTypeOf<View>().not.toHaveProperty("currency");
  });
});
describe("Invoice fallback", () => {
  const casts: CastLike[] = [
    { things: [], items: [] },
    {
      things: [{ type: "client", fields: ["name"] }],
      items: [{ id: "anna", type: "client", sample: true, name: "Anna" }],
    },
    { things: [], items: [{ id: "bad", type: "client", sample: false, name: 4 }] },
    {
      things: [{ type: "client", fields: ["name"] }],
      items: [{ id: "long", type: "client", sample: true, name: "a".repeat(80) }],
    },
  ];
  it.each(casts)("validates empty, matching, malformed and long cast content", (cast) =>
    expect(props.safeParse(fallback({ cast })).success).toBe(true),
  );
  it("uses neutral placeholders or cast titles, without domain content", () => {
    expect(fallback({ cast: casts[0]! })).toMatchObject({
      to: "Item one",
      lines: [{ item: "Item one", qty: 1, price: 0 }],
    });
    expect(fallback({ cast: casts[1]! })).toMatchObject({ to: "Anna", lines: [{ item: "Anna" }] });
  });
});
describe("Invoice metadata and probes", () => {
  it("keeps dense limits, tiers, core near miss and every action probe", () => {
    expect(meta).toMatchObject({
      status: "ready",
      dense: true,
      weight: 3,
      tier: "phone",
      partTiers: { send: "service" },
      confirmParts: ["decline"],
      states: ["filled", "success"],
    });
    expect(meta.realPath).not.toBe("");
    expect(meta.purpose.split(/\s+/).length).toBeLessThanOrEqual(16);
    expect(probes.filter((probe) => probe.kind === "choose")).toHaveLength(2);
    expect(probes.find((probe) => probe.kind === "choose" && probe.expect === "KeyValue")).toBeDefined();
    expect(probes.find((probe) => probe.kind === "write")).toMatchObject({ expect: "Invoice" });
    expect(probes.filter((probe) => probe.kind === "read").map((probe) => probe.expect)).toEqual([
      { address: "i1/send", action: "press" },
      { address: "i1/accept", action: "press" },
      { address: "i1/decline", action: "press" },
    ]);
    expect(createRegistry({ packs: ["customers"], includeDrafts: true }).resolve("i-n-v-o-i-c-e")).toBe(
      "Invoice",
    );
    expect(createRegistry().ids).not.toContain("Invoice");
  });
});
describe("Invoice states, parts and read/act", () => {
  it.each(["draft", "sent", "paid"] as const)("draws only valid actions with status %s", (status) => {
    for (const style of ["invoice", "quote"] as const) {
      if (style === "quote" && status === "paid") continue;
      const input = { ...seed, style, status },
        parsed = stampItemIds(meta, props.parse(input));
      const html = renderInstance("Invoice", input, "filled", theme);
      const actions = affordancesOf(meta, parsed, "i1");
      expect(actions.map(({ part }) => part)).toEqual(
        style === "quote" ? ["send", "accept", "decline"] : ["send"],
      );
      for (const { part } of actions)
        expect(elementAt(html, `home/c1/${part}`).attributes).toContain('role="button"');
      expect(html.includes("home/c1/accept")).toBe(style === "quote");
      expect(html.includes("home/c1/decline")).toBe(style === "quote");
      const reading = readComponent(components.Invoice, input, "i1").join("\n");
      for (const word of ["Subtotal", "Tax (10%)", "$70", "$7", "$77", "Qty 2", "$20 / each"])
        expect(reading).toContain(word);
      expect(reading).toContain("Issued · 2026-11-18");
      expect(reading).toContain("!needs-service");
    }
  });
});
describe("Invoice document parts", () => {
  it("addresses every document and line part, optional omission and eight dense lines", () => {
    const full = renderInstance("Invoice", seed, "filled", theme);
    for (const part of meta.parts.filter((part) => part !== "accept" && part !== "decline"))
      expect(elementAt(full, `home/c1/${part}`)).toBeDefined();
    const { due: _due, tax: _tax, note: _note, ...input } = seed;
    const html = renderInstance(
      "Invoice",
      { ...input, lines: Array.from({ length: 8 }, () => ({ item: "Visit", qty: 1, price: 0 })) },
      "filled",
      theme,
    );
    for (const part of ["due", "tax", "note"]) expect(html).not.toContain(`home/c1/${part}`);
    for (let row = 1; row <= 8; row++)
      for (const part of ["root", "item", "qty", "price"])
        expect(elementAt(html, `home/c1/r${row}/${part}`)).toBeDefined();
    expect(documentTotals(input)).toEqual({ subtotal: 70, tax: 0, total: 70 });
  });
});
describe("Invoice success and confirmation", () => {
  it("renders success as sent while preserving paid, quote actions and computed totals", () => {
    for (const style of ["invoice", "quote"] as const) {
      const html = renderInstance(
        "Invoice",
        { ...seed, style, status: "draft", due: "2099-01-01" },
        "success",
        theme,
      );
      expect(html).toContain("Sent");
      expect(html).toContain("$77");
      expect(html.includes("home/c1/accept")).toBe(style === "quote");
    }
    expect(
      renderInstance("Invoice", { ...seed, status: "paid", due: "2000-01-01" }, "success", theme),
    ).toContain("Paid");
  });
  it("dispatches sending and accepting, but waits for confirmation before declining", () => {
    const onAction = vi.fn();
    const runtime = createScreenController({
      screen: { id: "home", components: [{ ...examples[1]!, id: "i1", c: "Invoice" }] },
      defs: components,
      onAction,
    });
    expect(runtime.press("i1/send")).toMatchObject({ ok: true });
    expect(runtime.press("i1/accept")).toMatchObject({ ok: true });
    expect(onAction).toHaveBeenCalledTimes(2);
    runtime.press("i1/decline");
    expect(runtime.confirmation?.source).toBe("home/i1/decline");
    expect(onAction).toHaveBeenCalledTimes(2);
    runtime.press("confirm/cancel");
    expect(onAction).toHaveBeenCalledTimes(2);
    runtime.press("i1/decline");
    runtime.press("confirm/confirm");
    expect(onAction).toHaveBeenLastCalledWith({ address: "home/i1/decline", action: "press" });
    expect(runtime.confirmation).toBeUndefined();
  });
});

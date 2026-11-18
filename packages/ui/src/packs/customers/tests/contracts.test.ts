import { describe, expect, it } from "vitest";
import { components, type Definition } from "@lmthing/ui/catalog";

const defs: Record<string, Definition> = components;
const card = { name: "Alpha", photo: "local:1", tags: [], phone: false, address: false };
const entry = { date: "2026-11-18", kind: "visit", title: "Visit", goto: "details" };
const invoice = {
  number: "1",
  to: "Alpha",
  date: "2026-11-18",
  lines: [{ item: "Visit", qty: 1, price: 0 }],
  status: "draft",
};
const payment = { amount: 10, date: "2026-11-18" };
const review = { stars: 5, name: "Alpha", date: "2026-11-18", text: "Good" };
const summary = { average: 4, count: 1, bars: [0, 0, 0, 1, 0] };
const loyalty = { stamps: 0, of: 4, reward: "Reward" };
const agreement = { title: "Terms", terms: "Accept these terms", signed: false };
const invalid: Record<string, unknown[]> = {
  ClientCard: [
    { ...card, name: "a".repeat(29) },
    { ...card, next: "a".repeat(37) },
    { ...card, tags: ["a".repeat(13)] },
    { ...card, tags: ["a", "b", "c", "d"] },
    { ...card, photo: "https://example.org/photo" },
    { ...card, since: "2026-02-30" },
  ],
  ClientHistory: [
    { entries: [] },
    { entries: Array.from({ length: 7 }, () => entry) },
    { entries: [{ ...entry, title: "a".repeat(33) }] },
    { entries: [{ ...entry, kind: "unknown" }] },
    { entries: [{ ...entry, date: "2026-02-30" }] },
    { entries: [{ ...entry, goto: "Bad ID" }] },
    { entries: [{ ...entry, date: "2026-11-17" }, entry] },
    { entries: [{ ...entry, amount: Infinity }] },
  ],
  Invoice: [
    { ...invoice, number: "a".repeat(13) },
    { ...invoice, to: "a".repeat(29) },
    { ...invoice, note: "a".repeat(101) },
    { ...invoice, lines: [] },
    { ...invoice, lines: Array.from({ length: 9 }, () => invoice.lines[0]) },
    { ...invoice, lines: [{ item: "a".repeat(33), qty: 1, price: 0 }] },
    { ...invoice, lines: [{ item: "Visit", qty: 0, price: 0 }] },
    { ...invoice, lines: [{ item: "Visit", qty: 1, price: -1 }] },
    { ...invoice, tax: 101 },
    { ...invoice, tax: -1 },
    { ...invoice, status: "overdue" },
    { ...invoice, status: "paid", style: "quote" },
    { ...invoice, total: 10 },
    { ...invoice, due: "2026-02-30" },
  ],
  PaymentStatus: [
    { ...payment, amount: -1 },
    { ...payment, paid: -1 },
    { ...payment, method: "a".repeat(17) },
    { ...payment, status: "overdue" },
    { ...payment, due: "2026-02-30" },
    { ...payment, amount: NaN },
  ],
  Review: [
    { ...summary, average: 6 },
    { ...summary, count: -1 },
    { ...summary, count: 0.5 },
    { ...summary, bars: [0, 0, 0, 0] },
    { ...summary, bars: [0, 0, 0, 0, 0, 0] },
    { ...summary, bars: [-1, 0, 0, 0, 0] },
    { style: "summary" },
    { style: "list" },
    { style: "list", reviews: [] },
    { style: "list", reviews: Array.from({ length: 6 }, () => review) },
    ...[
      { stars: 0 },
      { stars: 6 },
      { stars: 1.5 },
      { name: "a".repeat(25) },
      { text: "a".repeat(241) },
      { reply: "a".repeat(161) },
      { date: "2026-02-30" },
    ].map((fields) => ({ style: "list", reviews: [{ ...review, ...fields }] })),
  ],
  Loyalty: [
    { ...loyalty, of: 3 },
    { ...loyalty, of: 13 },
    { ...loyalty, of: 4.5 },
    { ...loyalty, stamps: -1 },
    { ...loyalty, stamps: 1.5 },
    { ...loyalty, stamps: 5 },
    { ...loyalty, reward: "a".repeat(41) },
    { ...loyalty, name: "a".repeat(25) },
    { ...loyalty, redeem: true },
  ],
  Agreement: [
    { ...agreement, title: "a".repeat(33) },
    { ...agreement, terms: "a".repeat(601) },
    { ...agreement, name: "a".repeat(29) },
    { ...agreement, date: "2026-02-30" },
    { ...agreement, signed: "yes" },
  ],
};

describe("customers schema boundaries", () => {
  it("rejects every documented overflow, invalid choice, computed input and unknown key", () => {
    for (const [id, inputs] of Object.entries(invalid)) {
      const def = defs[id]!;
      for (const input of [{}, ...inputs, { ...(def.examples[0] as object), color: "red" }])
        expect(def.props.safeParse(input).success, `${id}: ${JSON.stringify(input)}`).toBe(false);
    }
  });
  it("accepts exact text and array limits, fractional prices and all styles", () => {
    const valid = {
      ClientCard: {
        ...card,
        name: "a".repeat(28),
        next: "a".repeat(36),
        tags: Array.from({ length: 3 }, () => "a".repeat(12)),
      },
      ClientHistory: {
        entries: Array.from({ length: 6 }, () => ({ ...entry, title: "a".repeat(32), amount: -2.5 })),
      },
      Invoice: {
        ...invoice,
        number: "a".repeat(12),
        to: "a".repeat(28),
        note: "a".repeat(100),
        tax: 100,
        lines: Array.from({ length: 8 }, () => ({ item: "a".repeat(32), qty: 0.5, price: 1.25 })),
      },
      PaymentStatus: { ...payment, paid: 2.5, method: "a".repeat(16) },
      Review: {
        style: "list",
        reviews: Array.from({ length: 5 }, () => ({
          ...review,
          name: "a".repeat(24),
          text: "a".repeat(240),
          reply: "a".repeat(160),
        })),
      },
      Loyalty: { stamps: 12, of: 12, reward: "a".repeat(40), name: "a".repeat(24) },
      Agreement: { ...agreement, title: "a".repeat(32), terms: "a".repeat(600), name: "a".repeat(28) },
    };
    for (const [id, input] of Object.entries(valid))
      expect(defs[id]!.props.safeParse(input).success).toBe(true);
    expect(components.Invoice.props.parse(invoice).style).toBe("invoice");
    expect(components.Review.props.parse(summary).style).toBe("summary");
  });
});

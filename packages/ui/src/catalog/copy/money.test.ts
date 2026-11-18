import { expect, it } from "vitest";
import {
  changeLine,
  compactMoneyLine,
  currencies,
  defaultCurrency,
  documentAmounts,
  documentFields,
  documentHeading,
  documentLabels,
  documentReading,
  documentSend,
  documentStatus,
  documentTotals,
  moneyLabels,
  moneyLine,
  paymentDetails,
  paymentLabels,
  paymentReading,
  paymentStatus,
  quantityLine,
} from "./money";

it("keeps currency defaults and money formatting unchanged", () => {
  expect(currencies).toHaveLength(21);
  expect(defaultCurrency).toBe("USD");
  expect(moneyLabels.total).toBe("Total");
  expect(moneyLine(1240.5)).toBe("$1,240.50");
  expect(moneyLine(120, "EUR", "night")).toBe("€120 / night");
  expect(moneyLine(18, "GBP", "each")).toBe("£18 / each");
  expect(changeLine(32, "money")).toBe("+$32");
  expect(changeLine(-4.5, "money", "EUR")).toBe("-€4.50");
  expect(changeLine(3.2, "percent")).toBe("+3.2%");
  expect(changeLine(0, "percent")).toBe("0%");
});

it("computes document totals independently from line quantities and rounds cents", () => {
  const lines = [
    { item: "Visit", qty: 2, price: 20 },
    { item: "Work", qty: 1, price: 30 },
  ];
  expect(documentTotals({ lines, tax: 10 })).toEqual({ subtotal: 70, tax: 7, total: 77 });
  expect(documentTotals({ lines })).toEqual({ subtotal: 70, tax: 0, total: 70 });
  expect(documentTotals({ lines, tax: 100 })).toEqual({ subtotal: 70, tax: 70, total: 140 });
  expect(documentTotals({ lines: [{ item: "Fraction", qty: 3, price: 0.1 }], tax: 10 })).toEqual({
    subtotal: 0.3,
    tax: 0.03,
    total: 0.33,
  });
  expect(documentTotals({ lines: [{ item: "Cents", qty: 1, price: 1.005 }], tax: 0 })).toEqual({
    subtotal: 1.01,
    tax: 0,
    total: 1.01,
  });
  expect(
    documentTotals({
      lines: Array.from({ length: 8 }, () => ({ item: "Free", qty: 0.5, price: 0 })),
      tax: 100,
    }),
  ).toEqual({ subtotal: 0, tax: 0, total: 0 });
});
it("derives overdue only for sent invoices before the local current day", () => {
  const now = new Date(2026, 10, 18, 12),
    input = { style: "invoice", status: "sent", due: "2026-11-17" } as const;
  expect(documentStatus(input, "filled", now)).toBe("Overdue");
  expect(documentStatus({ ...input, due: "2026-11-18" }, "filled", now)).toBe("Sent");
  expect(documentStatus({ ...input, due: "2026-11-19" }, "filled", now)).toBe("Sent");
  expect(documentStatus({ ...input, due: undefined }, "filled", now)).toBe("Sent");
  expect(documentStatus({ ...input, style: "quote" }, "filled", now)).toBe("Sent");
  expect(documentStatus({ ...input, status: "paid" }, "success", now)).toBe("Paid");
  expect(documentStatus({ ...input, status: "draft" }, "filled", now)).toBe("Draft");
  expect(documentStatus({ ...input, status: "draft" }, "success", now)).toBe("Overdue");
});
it("shares document headings, quantities, optional fields and readings", () => {
  const input = {
    number: "Q-1",
    to: "Client",
    date: "2026-11-18",
    style: "quote",
    status: "draft",
    lines: [{ item: "Work", qty: 2, price: 5 }],
  } as const;
  expect(documentHeading(input.style, input.number)).toBe("Quote Q-1");
  expect(quantityLine(0.5)).toBe("Qty 0.5");
  expect(documentFields(input)).toEqual([
    { part: "to", text: "To · Client" },
    { part: "date", text: "Issued · 2026-11-18" },
  ]);
  expect(documentFields({ ...input, due: "2026-12-02" }).at(-1)).toEqual({
    part: "due",
    text: "Due · 2026-12-02",
  });
  expect(documentAmounts(input)).toEqual([
    { part: "subtotal", label: "Subtotal", value: "$10" },
    { part: "total", label: "Total", value: "$10" },
  ]);
  expect(documentReading(input, "filled")).toEqual([
    "Quote Q-1",
    "Draft",
    "To · Client",
    "Issued · 2026-11-18",
    "Qty 2",
    "$5 / each",
    "Subtotal",
    "$10",
    "Total",
    "$10",
    "Send",
    "Accept",
    "Decline",
  ]);
  expect(documentReading({ ...input, status: "sent" }, "filled").slice(-3)).toEqual([
    "Resend",
    "Accept",
    "Decline",
  ]);
  expect(documentSend(input, "filled")).toEqual({ label: "Send", kind: "primary" });
  expect(documentSend(input, "success")).toEqual({ label: "Resend", kind: "primary" });
  expect(documentSend({ ...input, status: "sent" }, "filled")).toEqual({ label: "Resend", kind: "quiet" });
  expect(documentReading({ ...input, style: "invoice" }, "filled")).not.toContain(documentLabels.accept);
});

it("keeps ordinary prices exact and bounds large displayed prices", () => {
  expect([compactMoneyLine(0), compactMoneyLine(15.5), compactMoneyLine(9999.99)]).toEqual([
    "$0",
    "$15.50",
    "$9,999.99",
  ]);
  expect(compactMoneyLine(10000)).toBe("$10K");
  expect(compactMoneyLine(1e15)).toBe("$1E15");
  expect(compactMoneyLine(Number.MAX_VALUE)).toBe("$1.8E308");
});

it("derives settlement, partial and overdue states at the date and amount boundaries", () => {
  const input = { amount: 60, date: "2026-11-01" };
  const today = "2026-11-18";
  expect(paymentStatus(input, today)).toBe("due");
  expect(paymentStatus({ ...input, paid: 0, due: today }, today)).toBe("due");
  expect(paymentStatus({ ...input, paid: 20, due: "2026-11-19" }, today)).toBe("partial");
  expect(paymentStatus({ ...input, paid: 20, due: "2026-11-17" }, today)).toBe("overdue");
  expect(paymentStatus({ ...input, due: "2026-11-17" }, today)).toBe("overdue");
  for (const paid of [60, 61, Number.MAX_VALUE])
    expect(paymentStatus({ ...input, paid, due: "2026-11-17" }, today)).toBe("paid");
  expect(paymentStatus({ ...input, amount: 0 }, today)).toBe("paid");
  expect(paymentStatus({ ...input, paid: Number.MIN_VALUE }, today)).toBe("partial");
});

it("shares labelled payment details, with exact values and dates preserved for reading", () => {
  const input = { amount: Number.MAX_VALUE, paid: 0, date: "2024-02-29", due: "9999-12-31", method: "Cash" };
  expect(paymentDetails(input)).toEqual([
    { part: "paid", text: "Received $0" },
    { part: "date", text: "Date 29 Feb 2024" },
    { part: "due", text: "Due 31 Dec 9999" },
    { part: "method", text: "Cash" },
  ]);
  expect(paymentReading(input)).toEqual([
    "Due",
    "Total $1.8E308",
    String(Number.MAX_VALUE),
    "Received $0",
    "Date 29 Feb 2024",
    "Due 31 Dec 9999",
    "Cash",
    "0",
    "2024-02-29",
    "9999-12-31",
    "Mark as paid",
    "Remind",
  ]);
  expect(paymentDetails({ amount: 0, date: "2026-11-18" })).toEqual([
    { part: "date", text: "Date 18 Nov 2026" },
  ]);
  expect(paymentLabels.mark).toBe("Mark as paid");
  expect(paymentLabels.remind).toBe("Remind");
  expect(paymentLabels.updated).toBe("Update complete");
});

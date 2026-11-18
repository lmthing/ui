import { expect, it } from "vitest";
import {
  changeLine,
  compactMoneyLine,
  currencies,
  defaultCurrency,
  moneyLine,
  moneyLabels,
  paymentDetails,
  paymentLabels,
  paymentReading,
  paymentStatus,
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
    "$1.8E308",
    String(Number.MAX_VALUE),
    "Received $0",
    "Date 29 Feb 2024",
    "Due 31 Dec 9999",
    "Cash",
    "0",
    "2024-02-29",
    "9999-12-31",
  ]);
  expect(paymentDetails({ amount: 0, date: "2026-11-18" })).toEqual([
    { part: "date", text: "Date 18 Nov 2026" },
  ]);
  expect(paymentLabels.mark).toBe("Mark as paid");
  expect(paymentLabels.remind).toBe("Remind");
});

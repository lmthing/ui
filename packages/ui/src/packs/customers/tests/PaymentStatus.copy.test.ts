import { expect, it } from "vitest";
import { paymentDetails, paymentLabels, paymentReading, paymentStatus } from "../copy";

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

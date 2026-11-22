import { expect, it } from "vitest";
import { cabinFee, cabinLegend, cabinSeatDetails, cabinSuccess, cabinWindow } from "../../copy";

it("preserves a zero quote, distinguishes missing quotes, and uses the host currency", () => {
  expect(cabinFee(0)).toBe("$0");
  expect(cabinFee(undefined)).toBeUndefined();
  expect(cabinFee(45.5, "EUR", "de-DE")).toBe("45,50\u00a0€");
});

it("describes extra legroom and exit position independently from selection", () => {
  const seat = { col: "A", status: "extra" } as const;
  expect(cabinSeatDetails(12, seat, true, true)).toBe("12A · Selected · Extra legroom · Exit row");
  expect(cabinSeatDetails(12, seat, false, true)).toBe("12A · Extra legroom · Exit row");
  expect(cabinSeatDetails(12, { ...seat, status: "occupied" }, false)).toBe("12A · Occupied");
});

it("shows neighbours in map order, clamped at cabin boundaries", () => {
  const rows = [7, 8, 12, 13, 14].map((row) => ({ row, seats: [{ col: "A", status: "open" as const }] }));
  expect(cabinWindow(rows, 7, true)).toEqual(rows.slice(0, 2));
  expect(cabinWindow(rows, 12, true)).toEqual(rows.slice(1, 4));
  expect(cabinWindow(rows, 14, true)).toEqual(rows.slice(3));
  expect(cabinWindow(rows, undefined, true)).toBe(rows);
});

it("uses only the symbols drawn in the visible rows", () => {
  const standard = { row: 1, seats: [{ col: "A", status: "open" as const }] };
  const extra = { row: 2, seats: [{ col: "A", status: "extra" as const }] };
  expect(cabinLegend([standard])).toBe("");
  expect(cabinLegend([standard, extra])).toBe("* Extra legroom");
  expect(cabinLegend([{ ...standard, exit: true }])).toBe("Flag: exit row");
});

it("names the service-confirmed seat rather than a pending preview", () => {
  expect(cabinSuccess([{ row: 4, seats: [{ col: "C", status: "open" }] }])).toBe("Seat confirmed");
  expect(cabinSuccess([{ row: 4, seats: [{ col: "C", status: "selected" }] }])).toBe("Seat 4C confirmed");
});

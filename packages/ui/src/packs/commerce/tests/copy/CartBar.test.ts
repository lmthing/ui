import { expect, it } from "vitest";
import { cartBarReading } from "../../copy";

it("localizes quantity, pluralization and total without changing the host's values", () => {
  expect(cartBarReading("filled", [{ count: 1, total: 0 }])).toEqual(["View basket", "1 item", "$0"]);
  expect(cartBarReading("filled", [{ count: 2, total: 1234.5, currency: "EUR" }], "de-DE")).toEqual([
    "View basket",
    "2 items",
    "1.234,50\u00a0€",
  ]);
  expect(cartBarReading("filled", [{ count: 2, total: 1 }], "ar-EG")[1]).toContain("٢");
});

it.each([
  { records: undefined },
  { records: [] },
  { records: [null] },
  { records: [{ total: 12 }] },
  { records: [{ count: 0, total: 0 }] },
  { records: [{ count: -1, total: 12 }] },
  { records: [{ count: 1.5, total: 12 }] },
  { records: [{ count: Number.MAX_SAFE_INTEGER + 1, total: 12 }] },
  { records: [{ count: "2", total: 12 }] },
  { records: [{ count: 1 }] },
  { records: [{ count: 1, total: -1 }] },
  { records: [{ count: 1, total: Infinity }] },
  { records: [{ count: 1, total: 12, currency: "USD!" }] },
  {
    records: [
      { count: 1, total: 12 },
      { count: 1, total: 12 },
    ],
  },
])("does not invent a basket summary for $records", ({ records }) => {
  expect(cartBarReading("filled", records)).toEqual([]);
});

it("returns no reading when the host explicitly marks the bar empty, even with a prior summary", () => {
  expect(cartBarReading("empty", [{ count: 2, total: 24 }])).toEqual([]);
});

import { describe, expect, it } from "vitest";
import { receiptCopy, receiptLine, receiptReading } from "../../copy";

const line = { name: "Item one", qty: 3, price: 0.1 };
const input = {
  number: "101",
  date: "2026-11-20",
  mode: "table",
  place: "North counter",
  lines: [line, { name: "Item two", qty: 2, price: 0.35 }],
} as const;

describe("receipt copy", () => {
  it("calculates exact cents for extended prices and the order total", () => {
    expect(receiptLine(line, "full")).toEqual({
      name: "Item one",
      qty: "Qty 3",
      price: "$0.10 each",
      extended: "$0.30",
    });
    expect(receiptCopy(input)).toMatchObject({ mode: "At table", total: "$1.00" });
    expect(receiptLine({ ...line, qty: 2, price: 12 }, "full")).toMatchObject({
      price: "$12.00 each",
      extended: "$24.00",
    });
  });

  it("formats currency and dates for the requested locale", () => {
    const lang = "de-DE";
    expect(receiptCopy(input, lang)).toEqual({
      number: "Order #101",
      date: "20. Nov. 2026",
      mode: "At table",
      place: "North counter",
      total: "1,00\u00a0$",
      amount: 1,
    });
    expect(receiptLine(line, "brief", lang)).toMatchObject({
      extended: "0,30\u00a0$",
      price: undefined,
    });
    expect(receiptLine(line, "full", lang).price).toBe("0,10\u00a0$ each");
  });

  it("reads the brief receipt without unit prices and never reads loading content", () => {
    expect(receiptReading({ ...input, detail: "brief" }, "filled")).toEqual([
      "Order #101",
      "20 Nov 2026",
      "At table · North counter",
      "Item one",
      "Qty 3",
      "$0.30",
      "Item two",
      "Qty 2",
      "$0.70",
      "Total",
      "$1.00",
      "Total 1",
      "Reorder",
    ]);
    expect(receiptReading(input, "loading")).toEqual([]);
  });
});

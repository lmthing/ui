import { expect, it } from "vitest";
import { priceChartCopy, priceChartPoints, priceChartRange, priceChartReading } from "../../copy";

it.each([
  [98, 103, "$103", "+$5 this period"],
  [10, 7.5, "$7.50", "-$2.50 this period"],
  [0, 0, "$0", "$0 this period"],
  [0, 15000, "$15K", "+$15K this period"],
  [15000, 0, "$0", "-$15K this period"],
])("uses only the first and last samples (%s to %s)", (first, last, price, change) => {
  expect(priceChartCopy([first, 23, 8, last])).toEqual({ price, change });
});

it("formats amounts in the chosen locale and keeps the reading aligned with the chart", () => {
  expect(priceChartCopy([1, 12.5], "de-DE").price).toContain("12,50");
  expect(priceChartReading([1, 12.5], "de-DE")).toContain(priceChartCopy([1, 12.5], "de-DE").change);
});

it("keeps the supplied time order without inventing dates", () => {
  expect(priceChartPoints([3, 1, 2])).toEqual([
    { id: "p1", x: 0, value: 3, label: "Start" },
    { id: "p2", x: 1, value: 1, label: "" },
    { id: "p3", x: 2, value: 2, label: "Latest" },
  ]);
});

it("scales extreme finite points without changing the plotted proportions", () => {
  expect(priceChartPoints([Number.MAX_VALUE / 2, Number.MAX_VALUE]).map(({ value }) => value)).toEqual([
    0.5, 1,
  ]);
});

it("recognizes a range key or a shown label and ignores unsupported selections", () => {
  expect(priceChartRange("week", "month")).toBe("week");
  expect(priceChartRange("1D", "month")).toBe("day");
  for (const value of ["quarter", 2, null, undefined]) expect(priceChartRange(value, "month")).toBe("month");
});

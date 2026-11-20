import { expect, it } from "vitest";
import { isLowStock, thingCopy, thingsEmpty, thingsReading } from "../../copy";

it("derives the inclusive stock threshold, including zero and missing minimums", () => {
  expect(isLowStock({ qty: 0 })).toBe(false);
  expect(isLowStock({ qty: 0, min: 0 })).toBe(true);
  expect(isLowStock({ qty: 2, min: 3 })).toBe(true);
  expect(isLowStock({ qty: 3, min: 3 })).toBe(true);
  expect(isLowStock({ qty: 4, min: 3 })).toBe(false);
});

it("formats the exact count and a present zero value with the requested locale", () => {
  expect(thingCopy({ name: "Tool box", qty: 1200, min: 1200, value: 0 }, "en")).toEqual({
    initials: "TB",
    quantity: "1200",
    value: "$0",
    low: "Low stock",
  });
  const copy = thingCopy({ name: "Tool box", qty: 1200, value: 12.5 }, "de-DE");
  expect(copy.quantity).toBe("1200");
  expect(copy.value).toContain("12,50");
  expect(copy.low).toBeUndefined();
  expect(thingCopy({ name: "Tool box", qty: 1200 }, "ar-EG").quantity).toBe("١٢٠٠");
});

it("shares the shown stock message in the reading and uses neutral cast-aware empty copy", () => {
  expect(
    thingsReading({ filter: "all", items: [{ name: "Kit", qty: 0, min: 0, where: "Top shelf" }] }),
  ).toEqual(['"Kit" · Quantity: 0 · Minimum: 0 · "Top shelf" · Low stock']);
  expect(thingsReading({ filter: "low", items: [] })).toEqual([thingsEmpty("low").title]);
  expect(thingsEmpty("all", "en", "box").title).toBe("No boxes yet");
});

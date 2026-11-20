import { describe, expect, it } from "vitest";
import { productAmounts, productReading } from "../../copy";

describe("product price copy", () => {
  it("omits an absent comparison without losing a zero price", () => {
    expect(productAmounts({ price: 0 })).toEqual({ price: "$0", was: undefined });
    expect(productReading({ name: "Item one", price: 0 })).toBe("Item one · $0");
  });

  it("uses the same localized amounts for the view and the reading", () => {
    const item = { name: "Item one", price: 1234.5, was: 1500 };
    expect(productAmounts(item, "de-DE")).toEqual({ price: "1.234,50\u00a0$", was: "1.500\u00a0$" });
    expect(productReading(item, "de-DE")).toBe("Item one · 1.500\u00a0$ → 1.234,50\u00a0$");
  });
});

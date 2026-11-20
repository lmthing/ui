import { describe, expect, it } from "vitest";
import { productDetailCopy, productDetailReading } from "../../copy";

describe("Product copy", () => {
  it("formats prices and stock using the requested locale", () => {
    const input = { price: 12.5, was: 16, stock: 1200, qty: 2 };
    expect(productDetailCopy(input)).toEqual({ price: "$12.50", was: "$16", stock: "Only 1200 left" });
    const copy = productDetailCopy(input, "de-DE");
    expect(copy.price).toContain("12,50");
    expect(productDetailCopy(input, "ar-EG").stock).toContain("١٢٠٠");
    expect(productDetailReading(input, "filled", "ar-EG")).toContain("Quantity: ٢");
  });
  it("keeps absence, sold out, and success distinct", () => {
    const input = { price: 12, qty: 1 };
    expect(productDetailReading(input, "filled")).toEqual(["$12", "Quantity: 1", "Add to basket"]);
    expect(productDetailReading({ ...input, stock: 0 }, "filled")).toEqual([
      "$12",
      "stock · 0",
      "Sold out",
      "Quantity: 0",
      "Add to basket",
    ]);
    expect(productDetailReading({ ...input, was: 16 }, "success")).toEqual(["$16 → $12", "Added to basket"]);
    expect(productDetailReading(input, "loading")).toEqual([]);
  });
  it("keeps exact prices, including large amounts", () => {
    expect(productDetailCopy({ price: 12499.01, qty: 1 }).price).toBe("$12,499.01");
  });
});

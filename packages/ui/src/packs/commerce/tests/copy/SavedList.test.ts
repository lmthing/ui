import { expect, it } from "vitest";
import { savedItemCopy } from "../../copy";

const item = { name: "Planter", price: 10.01, savedPrice: 10.1, targetPrice: 10 };

it("formats the original and current prices, the cent-exact drop, and the target", () => {
  expect(savedItemCopy(item, "en-GB", "GBP")).toEqual({
    current: "£10.01",
    previous: "Was £10.10",
    target: "£10",
    badge: { tone: "good", text: "£0.09 less" },
  });
});

it("flags stock first, without treating unknown stock, price rises or ties as discounts", () => {
  expect(savedItemCopy({ ...item, stock: 0 }).badge?.text).toBe("Sold out");
  expect(savedItemCopy({ ...item, stock: 3 }).badge?.text).toBe("Only 3 left");
  expect(savedItemCopy({ ...item, stock: 4 }).badge?.tone).toBe("good");
  for (const savedPrice of [undefined, 10, 10.01]) {
    expect(savedItemCopy({ ...item, savedPrice }).badge).toBeUndefined();
  }
});

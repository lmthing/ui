import { expect, it } from "vitest";
import { cartLineCopy, cartReading, cartTotals } from "../../copy";

const line = { name: "Fern pot", variant: "Olive", qty: 3, price: 0.19 };
const lines = [line, { name: "Basil planter", qty: 2, price: 12.03 }];

it("formats extended prices and adds delivery in cents", () => {
  expect(cartLineCopy(line, "full", "en-US")).toMatchObject({ price: "$0.57", note: "Olive · $0.19 each" });
  expect(cartTotals({ lines, delivery: 0.05 }, "en-US")).toEqual([
    { part: "subtotal", label: "Subtotal", amount: "$24.63" },
    { part: "delivery", label: "Delivery", amount: "$0.05" },
    { part: "total", label: "Total", amount: "$24.68" },
  ]);
});

it("localizes money and omits absent delivery", () => {
  expect(cartTotals({ lines }, "de-DE")).toEqual([
    { part: "subtotal", label: "Subtotal", amount: "24,63 $" },
    { part: "total", label: "Total", amount: "24,63 $" },
  ]);
});

it("reads computed values, while brief detail omits the note and inactive states read no amounts", () => {
  const full = cartReading({ lines, delivery: 0 }, "filled", "en-US");
  expect(full).toEqual(
    expect.arrayContaining(["Olive · $0.19 each", "$0.57", "Delivery", "delivery · $0.00", "Total 24.63"]),
  );
  expect(cartReading({ lines, delivery: 0, detail: "brief" }, "filled", "en-US")).toEqual(
    full.map((text) => (text === "Olive · $0.19 each" ? "$0.19 each" : text)),
  );
  expect(cartReading({ lines }, "loading", "en-US")).toEqual([]);
  expect(cartReading({ lines }, "empty", "en-US")).toEqual([]);
});

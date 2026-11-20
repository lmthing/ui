import { expect, it } from "vitest";
import { checkoutAmount } from "../../copy";

it("formats the host total in its currency and the app locale", () => {
  const basket = [{ total: 1234.5, currency: "EUR" }];
  expect(checkoutAmount(basket, "en-US")).toBe("€1,234.50");
  expect(checkoutAmount(basket, "de-DE")).toBe("1.234,50\u00a0€");
  expect(checkoutAmount([{ total: 0 }], "en-US")).toBe("$0");
});

it.each(
  [
    undefined,
    [],
    [null],
    [{}],
    [{ total: -1 }],
    [{ total: Infinity }],
    [{ total: "25" }],
    [{ total: 25, currency: "unknown" }],
    [{ total: 25 }, { total: 25 }],
  ].map((records) => ({ records })),
)("does not invent a total for $records", ({ records }) => {
  expect(checkoutAmount(records)).toBe("Unavailable");
});

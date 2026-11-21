import { expect, it } from "vitest";
import { appCurrencySchema, parseAppCurrency } from "./index";

it.each(["USD", "EUR", "JPY", "KWD", "XCG"])("accepts the ISO 4217 code %s", (code) => {
  expect(parseAppCurrency(code)).toBe(code);
});

it.each(["ZZZ", "US", "usd", " EUR", "EUR ", "XXX", "XTS", "", null, 840])("rejects %j", (code) => {
  expect(appCurrencySchema.safeParse(code).success).toBe(false);
  expect(() => parseAppCurrency(code)).toThrow();
});

it("leaves omitted currency unset", () => {
  expect(parseAppCurrency(undefined)).toBeUndefined();
});

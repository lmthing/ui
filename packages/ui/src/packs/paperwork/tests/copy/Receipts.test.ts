import { describe, expect, it } from "vitest";
import { receiptCurrency, receiptDetails } from "../../copy";

describe("receipt copy", () => {
  const row = { date: "2026-11-19", amount: 24.5, tags: [], file: "local:sensitive" };
  it.each([
    [0, "£0"],
    [50, "£12.25"],
    [100, "£24.50"],
  ])("computes the assigned amount for %s percent", (allocation, value) => {
    expect(receiptDetails({ ...row, allocation }, "GBP", "en")).toContainEqual({
      part: "allocated_amount",
      line: value,
    });
  });
  it("omits an unspecified allocation and validates host currency separately", () => {
    expect(receiptDetails(row, "GBP", "en").some(({ part }) => part === "allocation")).toBe(false);
    expect(receiptCurrency({ currency: ["GBP"] })).toBe("GBP");
    expect(receiptCurrency({ currency: ["bad"] })).toBe("USD");
  });
});

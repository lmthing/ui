import { describe, expect, it } from "vitest";
import { variantExtra, variantReading } from "../../copy";

describe("VariantPicker copy", () => {
  it("formats signed, zero and localized price changes without inventing missing ones", () => {
    expect(variantExtra(undefined, "full")).toBeUndefined();
    expect(variantExtra(2.5, "brief")).toBeUndefined();
    expect(variantExtra(2.5, "full", "en-US")).toBe("+$2.50");
    expect(variantExtra(-2.5, "full", "en-US")).toBe("-$2.50");
    expect(variantExtra(0, "full", "en-US")).toBe("$0");
    expect(variantExtra(2.5, "full", "de-DE")).toContain("2,50");
  });

  it("keeps availability in the reading when price differences are hidden", () => {
    const options = [
      { label: "One", available: true },
      { label: "Two", available: true, extra: 0 },
      { label: "Three", available: false, extra: 1 },
    ];
    expect(variantReading(options, "full", "en-US")).toEqual(["Two · $0", "Three · +$1 · Sold out"]);
    expect(variantReading(options, "brief", "en-US")).toEqual(["Three · Sold out"]);
  });
});

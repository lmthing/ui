import { describe, expect, it } from "vitest";
import { promoExpiry } from "../../copy";

describe("promo expiry copy", () => {
  it("formats the stored date in the requested locale", () => {
    expect(promoExpiry("2026-11-30")).toBe("ends · 30 Nov 2026");
    expect(promoExpiry("2026-11-30", "en-US")).toBe("ends · Nov 30, 2026");
  });
});

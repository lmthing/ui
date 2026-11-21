import { describe, expect, it } from "vitest";
import { wishCopy, wishReading } from "../../copy";

describe("Wishlist copy", () => {
  it("distinguishes zero from missing amounts and formats the requested locale", () => {
    expect(wishCopy({ price: 0, target: 25.5, priority: 1 }, "full", "de-DE")).toEqual({
      price: ["Price ", "0\u00a0$"],
      target: ["Target ", "25,50\u00a0$"],
      priority: "High priority",
    });
    expect(wishCopy({ priority: 3 }, "full")).toEqual({
      price: undefined,
      target: undefined,
      priority: "Low priority",
    });
    expect(wishCopy({ target: Number.MAX_VALUE, priority: 2 }, "full").target).toEqual([
      "Target ",
      "$1.8E308",
    ]);
  });

  it("reads each row's visible figures with its stable ordinal", () => {
    const items = [
      { priority: 2, target: 0 },
      { priority: 1, price: 5, target: 2 },
    ];
    expect(wishReading({ items, detail: "full" })).toEqual([
      "r1 Target $0 · Medium priority · Mark as owned",
      "r2 Price $5 · Target $2 · High priority · Mark as owned",
    ]);
    expect(wishReading({ items, detail: "brief" })).toEqual([
      "r1 Medium priority · Mark as owned",
      "r2 Price $5 · High priority · Mark as owned",
    ]);
  });
});

import { describe, expect, it } from "vitest";
import { watchlistQuote, watchlistReading } from "../../copy";

const quote = { name: "Income Fund", symbol: "IFD", price: 55, quotedAt: "2026-03-01T16:00:00Z" };

describe("watch quote copy", () => {
  it("computes a signed relative gap and honors both directions and equality", () => {
    const target = (price: number, direction?: "at_or_above") =>
      watchlistQuote({ ...quote, price, target: 50, direction }, "full").threshold;
    expect(target(55)).toEqual({ target: "Target ≤ $50", gap: "+10% · Not met", met: false });
    expect(target(55, "at_or_above")).toMatchObject({ gap: "+10% · Target met", met: true });
    expect(target(50)).toMatchObject({ gap: "0% · Target met", met: true });
    expect(target(0, "at_or_above")).toMatchObject({ gap: "-100% · Not met", met: false });
  });
  it("keeps zero a quote and preserves the quoted date in the requested locale", () => {
    const input = { ...quote, price: 0, quotedAt: "2026-03-01T23:30:00-02:00", target: 50 };
    expect(watchlistQuote(input, "brief", "en-GB")).toEqual({
      price: "US$0",
      date: "2 Mar 2026",
      threshold: undefined,
    });
    expect(watchlistReading({ items: [quote], detail: "full" })).toEqual([
      "Income Fund; IFD · 1 Mar 2026; $55",
    ]);
  });
});

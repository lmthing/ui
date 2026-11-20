import { describe, expect, it } from "vitest";
import { converterAmounts, converterReading, exchangeRateOf } from "../../copy";

const quote = { home: "USD", local: "JPY", rate: 150, date: "2026-11-19" };
const deviceData = { exchange_rates: [quote] };

describe("Converter copy", () => {
  it("projects a home amount and accepts a cached quote", () => {
    expect(exchangeRateOf(deviceData)).toEqual(quote);
    const amounts = converterAmounts({ value: 25 }, exchangeRateOf(deviceData));
    expect(amounts).toEqual([
      { side: "home", currency: "USD", value: 25 },
      { side: "local", currency: "JPY", value: 3750 },
    ]);
  });

  it("divides an edited local amount and preserves its source when swapped", () => {
    const rate = exchangeRateOf(deviceData);
    const input = { value: 152, edited: "local" } as const;
    const normal = converterAmounts(input, rate);
    expect(normal[0].value).toBeCloseTo(1.01333);
    expect(normal[1].value).toBe(152);
    expect(converterAmounts({ ...input, swapped: true }, rate)).toEqual([normal[1], normal[0]]);
  });

  it("distinguishes a blank amount, zero and an unavailable quote", () => {
    expect(converterAmounts({}, exchangeRateOf(deviceData)).map(({ value }) => value)).toEqual([
      undefined,
      undefined,
    ]);
    expect(converterAmounts({ value: 0 }, exchangeRateOf(deviceData)).map(({ value }) => value)).toEqual([
      0, 0,
    ]);
    expect(converterAmounts({ value: 25 }).map(({ value }) => value)).toEqual([25, undefined]);
    expect(converterReading({})).toContain("Exchange rate unavailable");
  });

  it.each([
    { ...quote, rate: 0 },
    { ...quote, rate: -1 },
    { ...quote, rate: Number.MIN_VALUE },
    { ...quote, rate: Number.MAX_VALUE },
    { ...quote, rate: Infinity },
    { ...quote, local: "ZZZ" },
    { ...quote, local: quote.home },
    { ...quote, date: "2026-02-30" },
    null,
  ])("ignores an unusable exchange rate", (record) => {
    expect(exchangeRateOf({ exchange_rates: [record] })).toBeUndefined();
  });

  it("formats the target in its own minor units and localizes the date and amounts", () => {
    const input = { value: 25.51 };
    const english = converterReading(input, "en-US", deviceData);
    expect(english).toEqual([
      "Home amount: $25.51",
      "Local amount: ¥3,827",
      "Rate as of Nov 19, 2026",
      "Swap currencies",
    ]);
    const german = converterReading(input, "de-DE", deviceData);
    expect(german[0]).toContain("25,51");
    expect(german[2]).toContain("19. Nov.");
  });
});

import { describe, expect, it } from "vitest";
import { converterDisplay, converterReading, exchangeRateOf, projectConverter } from "../../copy";

const quote = { home: "USD", local: "JPY", rate: 150, date: "2026-11-19" };
const deviceData = { exchange_rates: [quote] };

describe("Converter copy", () => {
  it("projects a home amount and accepts a cached quote", () => {
    expect(exchangeRateOf(deviceData)).toEqual(quote);
    expect(projectConverter({ value: 25 }, { swapped: false }, deviceData)).toMatchObject({
      fromText: "25",
      toText: "3750",
    });
    expect(projectConverter({ value: 25 }, { swapped: true }, deviceData)).toMatchObject({
      fromText: "3750",
      toText: "25",
    });
  });

  it("divides an edited local amount and preserves its source when swapped", () => {
    const local = projectConverter({}, { swapped: false, edit: { part: "to", text: "152." } }, deviceData);
    expect(local).toMatchObject({ fromText: "1.01", toText: "152." });
    const swapped = projectConverter({}, { swapped: true, edit: { part: "from", text: "152." } }, deviceData);
    expect(swapped).toMatchObject({ fromText: "152.", toText: "1.01" });
  });

  it.each(["", ".", "abc", "0x10", "-2"])("does not compute for an unfinished or invalid edit %j", (text) => {
    expect(
      projectConverter({ value: 25 }, { swapped: false, edit: { part: "from", text } }, deviceData),
    ).toMatchObject({ fromText: text, toText: "" });
  });

  it("distinguishes a missing seed, zero and an unavailable quote", () => {
    expect(projectConverter({}, { swapped: false }, deviceData)).toMatchObject({ fromText: "", toText: "" });
    expect(projectConverter({ value: 0 }, { swapped: false }, deviceData)).toMatchObject({
      fromText: "0",
      toText: "0",
    });
    const missing = projectConverter({ value: 25 }, { swapped: false }, {});
    expect(missing).toMatchObject({ fromText: "25", toText: "" });
    expect(converterReading(missing)).toContain("Exchange rate unavailable");
  });
});

describe("Converter quote and display copy", () => {
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
    const input = projectConverter({ value: 25.51 }, { swapped: false }, deviceData);
    const english = converterReading(input, "en-US");
    expect(english).toEqual([
      "USD · Home amount: 25.51",
      "JPY · Local amount: 3827",
      "Swap currencies",
      "Rate as of Nov 19, 2026",
    ]);
    const german = converterReading(input, "de-DE");
    expect(german[0]).toContain("25,51");
    expect(german[3]).toContain("19. Nov.");
    expect(converterReading({ ...input, detail: "brief" }, "en-US")).toEqual(english.slice(0, 3));
  });

  it("accepts a decimal comma while keeping the edit exactly as typed", () => {
    const input = projectConverter(
      {},
      { swapped: false, edit: { part: "from", text: "025,510" } },
      deviceData,
    );
    expect(converterDisplay(input, "en-US").fields.map(({ text }) => text)).toEqual(["025,510", "3827"]);
  });
});

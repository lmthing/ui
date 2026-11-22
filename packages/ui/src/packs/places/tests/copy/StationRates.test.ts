import { expect, it } from "vitest";
import { stationHeadline, stationRatesCopy, stationRatesReading } from "../../copy";

it("formats in the host currency and locale and leaves the supplied unit and update time unchanged", () => {
  const input = {
    name: "Canal Green",
    updatedAt: "9:12",
    grades: [{ label: "Charging", price: 1.25, unit: "kWh" }],
  };
  const board = stationRatesCopy(input, "filled", "EUR", "de-DE");
  expect(board.grades[0]?.value).toBe("1,25\u00a0€/kWh");
  expect(board.updated).toBe("Updated 9:12");
  expect(stationRatesReading(input, "filled", "EUR", "de-DE")).toContain('"Charging": 1,25\u00a0€/kWh');
});

it("sums all connectors and derives tones for unavailable, scarce and available stalls", () => {
  const input = {
    name: "Canal Green",
    chargers: [
      { connector: "CCS", kw: 150.5, available: 0, total: 2 },
      { connector: "NACS", kw: 250, available: 1, total: 3 },
      { connector: "Type 2", kw: 22, available: 2, total: 4 },
    ],
  };
  expect(stationHeadline(input)).toEqual({ available: 3, total: 9 });
  const board = stationRatesCopy(input, "filled", undefined, "de-DE");
  expect(board.chargers.map(({ tone }) => tone)).toEqual(["bad", "warn", "good"]);
  expect(board.chargers[0]?.power).toBe("150,5 kW");
  expect(board.headline).toMatchObject({ value: "3 of 9 open", tone: "warn" });
});

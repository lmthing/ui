import { expect, it } from "vitest";
import { holdingCopy, holdingsReading } from "../../copy";

const position = {
  name: "Index Fund",
  symbol: "IFD",
  units: 2.5,
  unitCost: 40,
  price: 38,
  quotedAt: "2026-03-02T00:15:00+01:00",
};

it("formats a fractional quantity, dated quote, computed value and signed loss in the host currency", () => {
  expect(holdingCopy(position, "en-GB", "GBP")).toEqual({
    units: "2.5 units",
    unitCost: "Unit cost £40",
    value: "£95",
    price: "Quote £38",
    date: "1 Mar 2026",
    gain: "Gain -£5",
    gainTone: "bad",
  });
  expect(holdingCopy({ ...position, units: 1, price: 45 }, "de-DE", "EUR")).toMatchObject({
    units: "1 unit",
    gain: "Gain +5\u00a0€",
    gainTone: "good",
  });
});

it("shows zero as known, null projections as unknown, and keeps huge numbers bounded", () => {
  expect(holdingCopy({ ...position, price: 0, unitCost: 0 })).toMatchObject({
    price: "Quote $0",
    value: "$0",
    gain: "Gain $0",
    gainTone: "muted",
  });
  expect(
    holdingCopy({ ...position, price: undefined, quotedAt: undefined, value: null, gain: null }),
  ).toMatchObject({
    price: "Quote Unknown",
    date: "No saved quote",
    value: "Unknown",
    gain: "Gain Unknown",
  });
  expect(holdingCopy({ ...position, units: Number.MAX_VALUE, value: Number.MAX_VALUE }).value).toBe(
    "$1.8E308",
  );
  expect(holdingCopy({ ...position, units: Number.MAX_VALUE }).value).toBe("Unknown");
});

it("omits full details in a brief reading and localizes the count beyond visible positions", () => {
  expect(holdingsReading({ positions: [position], detail: "brief", positionCount: 4 })).toEqual([
    "Index Fund",
    "IFD",
    "2.5 units",
    "Value $95",
    "and 3 more",
  ]);
});

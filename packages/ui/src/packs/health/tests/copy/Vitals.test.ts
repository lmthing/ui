import { describe, expect, it } from "vitest";
import {
  vitalBand,
  vitalLabels,
  vitalLine,
  vitalRangeLine,
  vitalStatusLine,
  vitalUnitLine,
} from "../../copy";

const reading = {
  label: "Blood pressure",
  value: 118,
  value2: 76,
  unit: "mmHg",
  low: 90,
  high: 120,
  at: "08:10",
};

describe("Vitals copy and reference geometry", () => {
  it("reads the exact pair, unit, reference, status and date without a diagnosis", () => {
    expect(vitalLine(reading)).toBe("Blood pressure: 118 / 76 mmHg · Reference 90–120 · In range · 08:10");
    expect(vitalLabels.add).toBe("Add reading");
    expect(vitalUnitLine({ unit: "bpm" })).toBe("bpm");
    expect(vitalUnitLine({ unit: "mmHg", value2: 0 })).toBe("/ 0 mmHg");
  });
  it.each([
    [89, "warn"],
    [90, "text"],
    [118, "text"],
    [120, "text"],
    [121, "warn"],
  ] as const)("computes the primary status at %s using %s only", (value, tone) => {
    expect(vitalBand({ ...reading, value }).tone).toBe(tone);
    expect(vitalStatusLine({ ...reading, value })).toBe(tone === "warn" ? "Outside range" : "In range");
  });
  it.each([
    { value: 0, low: 0, high: 0 },
    { value: -0.25, low: -0.5, high: 0 },
    { value: -1000000, low: 90, high: 120 },
    { value: 1000000, low: -1000000, high: -1000000 },
    { value: 1000000, low: -1000000, high: 1000000 },
  ])("keeps finite geometry and visible low/high regions even at the limits", (input) => {
    const band = vitalBand(input);
    expect(Number.isFinite(band.min) && Number.isFinite(band.max)).toBe(true);
    expect(band.min).toBeLessThan(Math.min(input.low, input.value));
    expect(band.max).toBeGreaterThan(Math.max(input.high, input.value));
    expect(band.max).toBeGreaterThan(band.min);
    expect(band.tone).toBe(input.value < input.low || input.value > input.high ? "warn" : "text");
  });
  it("does not compare the second reading with the primary range or round values", () => {
    expect(vitalLine({ ...reading, value2: -1000000 })).toContain("In range");
    expect(vitalLine({ ...reading, value: -0.125, value2: 0 })).toContain("-0.125 / 0 mmHg");
    expect(vitalRangeLine({ low: -2, high: -2 })).toBe("Reference -2–-2");
    expect(vitalStatusLine({ value: -2, low: -2, high: -2 })).toBe("In range");
  });
});

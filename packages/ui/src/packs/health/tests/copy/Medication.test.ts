import { describe, expect, it } from "vitest";
import { medicationLabels, medicationReading, orderedDoses, refillLine, stockLine } from "../../copy";

const doses = [
  { name: "Evening", time: "20:00", status: "taken" as const, left: 6 },
  { name: "Morning", time: "08:00", status: "due" as const, left: 5 },
  { name: "No stock", time: "08:00", status: "skipped" as const },
];
describe("Medication copy", () => {
  it("orders times stably without mutating doses", () => {
    expect(orderedDoses(doses).map((dose) => dose.name)).toEqual(["Morning", "No stock", "Evening"]);
    expect(doses[0]!.name).toBe("Evening");
  });
  it("warns at the exact threshold, including zero, and never invents a threshold", () => {
    expect(refillLine(doses)).toBeUndefined();
    expect(refillLine(doses, 4)).toBeUndefined();
    expect(refillLine(doses, 5)).toBe("Refill: Morning");
    expect(refillLine(doses, 6)).toBe("Refill: Morning, Evening");
    expect(refillLine([{ ...doses[0]!, left: 0 }], 0)).toBe("Refill: Evening");
    expect(refillLine([{ ...doses[0]!, left: undefined }], 10000)).toBeUndefined();
  });
  it("reads exact stock boundaries and every status with conditional actions", () => {
    expect(stockLine(0)).toBe("0 left");
    expect(stockLine(10000)).toBe("10000 left");
    expect(medicationReading({ doses, refillAt: 5 })).toEqual([
      "Morning: 08:00 · Due",
      "Taken",
      "Skip",
      "5 left",
      "No stock: 08:00 · Skipped",
      "Evening: 20:00 · Taken",
      "6 left",
      "Refill: Morning",
    ]);
    expect(medicationReading({ doses: [doses[0]!] })).toContain(medicationLabels.success);
    expect(medicationReading({ doses })).not.toContain(medicationLabels.success);
  });
});

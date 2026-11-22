import { describe, expect, it } from "vitest";
import { meterDate, meterSeries, meterSummary, meterUsage, meterValue } from "../../copy";

const older = { meterRef: "a", at: "2026-01-01T09:00:00+01:00", value: 0.2 };
const newer = { meterRef: "a", at: "2026-01-02T08:00:00Z", value: 0.3 };

describe("meter copy", () => {
  it("sorts by instant within a meter without editing the original order", () => {
    const seed = [newer, { ...newer, meterRef: "b" }, older];
    expect(meterSeries(seed, "a")).toEqual([older, newer]);
    expect(seed[0]).toBe(newer);
  });

  it("does not manufacture usage when no baseline exists", () => {
    expect(meterSummary([], "m3").latest).toBeUndefined();
    expect(meterSummary([newer], "m3")).toEqual({
      latest: "0.3\u00a0m³",
      previous: undefined,
      usage: undefined,
    });
    expect(meterUsage({ ...newer, value: 0.2 }, older, "m3")).toBe("0\u00a0m³ used · 1 day");
  });

  it("keeps decimal differences readable, including exponential input", () => {
    expect(meterUsage(newer, older, "m3")).toBe("0.1\u00a0m³ used · 1 day");
    expect(meterUsage({ ...newer, value: 3e-8 }, { ...older, value: 2e-8 }, "m3")).toBe(
      "1e-8\u00a0m³ used · 1 day",
    );
  });

  it("uses the viewing locale for numbers and dates but retains the stored local clock", () => {
    expect(meterValue(17.5, "m3", "fr-FR")).toBe("17,5\u00a0m³");
    expect(meterDate(older.at)).toContain("09:00");
    expect(meterDate(older.at, "fr-FR")).toContain("janv.");
    expect(meterUsage(newer, older, "m3", "fr-FR")).toContain("0,1\u00a0m³");
  });
});

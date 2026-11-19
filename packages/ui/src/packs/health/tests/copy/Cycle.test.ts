import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cycleDayLine,
  cycleEstimate,
  cycleLabels,
  cycleNextLine,
  cycleReading,
  cycleToday,
  cycleWindowLine,
} from "../../copy";

const seed = { start: "2026-11-01", length: 28, period: 5 };
afterEach(() => vi.useRealTimers());

describe("Cycle calendar estimates", () => {
  it.each([
    ["2026-10-31", 0, cycleLabels.upcoming, "2026-11-01"],
    ["2026-11-01", 1, cycleLabels.period, "2026-11-29"],
    ["2026-11-05", 5, cycleLabels.period, "2026-11-29"],
    ["2026-11-06", 6, cycleLabels.follicular, "2026-11-29"],
    ["2026-11-14", 14, cycleLabels.follicular, "2026-11-29"],
    ["2026-11-15", 15, cycleLabels.ovulation, "2026-11-29"],
    ["2026-11-16", 16, cycleLabels.luteal, "2026-11-29"],
    ["2026-11-28", 28, cycleLabels.luteal, "2026-11-29"],
    ["2026-11-29", 1, cycleLabels.period, "2026-12-27"],
    ["2026-12-27", 1, cycleLabels.period, "2027-01-24"],
  ])("estimates %s from the logged start", (today, day, phase, next) => {
    expect(cycleEstimate(seed, today)).toMatchObject({ day, phase, next });
  });
  it("marks six fertile days ending fourteen dates before the next period", () => {
    expect(cycleEstimate(seed, "2026-11-19")).toEqual({
      day: 19,
      phase: cycleLabels.luteal,
      fertileFrom: 10,
      fertileTo: 15,
      next: "2026-11-29",
      windowStart: "2026-11-10",
      windowEnd: "2026-11-15",
    });
    expect(cycleEstimate(seed, "2026-11-29")).toMatchObject({
      windowStart: "2026-12-08",
      windowEnd: "2026-12-13",
    });
  });
  it.each([
    [{ start: "2024-02-01", length: 28, period: 5 }, "2024-02-29", "2024-03-28"],
    [{ start: "2026-12-20", length: 21, period: 2 }, "2027-01-09", "2027-01-10"],
    [{ start: "2026-03-01", length: 40, period: 10 }, "2026-03-31", "2026-04-10"],
  ])("crosses leap days, year ends and daylight-saving dates", (input, today, next) => {
    expect(cycleEstimate(input, today).next).toBe(next);
  });
  it("keeps the declared period duration even when it overlaps a short-cycle fertile estimate", () => {
    expect(cycleEstimate({ ...seed, length: 21, period: 10 }, "2026-11-08").phase).toBe(cycleLabels.period);
    expect(cycleEstimate({ ...seed, length: 21, period: 10 }, "2026-11-11").phase).toBe(cycleLabels.luteal);
  });
  it("bounds every day across all allowed lengths and period durations", () => {
    for (let length = 21; length <= 40; length++)
      for (let period = 2; period <= 10; period++)
        for (let day = 1; day <= length; day++) {
          const today = new Date(Date.UTC(2026, 10, day)).toISOString().slice(0, 10);
          const cycle = cycleEstimate({ ...seed, length, period }, today);
          expect(cycle.day).toBe(day);
          expect(cycle.fertileFrom).toBeGreaterThanOrEqual(1);
          expect(cycle.fertileTo).toBeLessThanOrEqual(length);
          expect(cycle.fertileTo - cycle.fertileFrom).toBe(5);
          if (day <= period) expect(cycle.phase).toBe(cycleLabels.period);
        }
  });
});

describe("Cycle wording", () => {
  it("uses the viewer's local calendar date", () => {
    const local = new Date(2026, 10, 19, 23, 59);
    expect(cycleToday(local)).toBe("2026-11-19");
    vi.useFakeTimers();
    vi.setSystemTime(local);
    expect(cycleToday()).toBe("2026-11-19");
  });
  it("formats numbers and unambiguously estimated dates", () => {
    expect(cycleDayLine(0)).toBe("Not started");
    expect(cycleDayLine(40)).toBe("Day 40");
    expect(cycleNextLine("2027-01-10")).toBe("Next period · 10 Jan 2027 (est.)");
    expect(cycleWindowLine("2026-12-31", "2027-01-05")).toBe(
      "Fertile window (est.) · 31 Dec 2026 – 5 Jan 2027",
    );
  });
  it("reads every computed line, the action and contraception caveat", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 19, 12));
    expect(cycleReading(seed)).toEqual([
      "Day 19",
      cycleLabels.luteal,
      "Next period · 29 Nov 2026 (est.)",
      "Fertile window (est.) · 10 Nov 2026 – 15 Nov 2026",
      cycleLabels.log,
      cycleLabels.disclaimer,
    ]);
  });
});

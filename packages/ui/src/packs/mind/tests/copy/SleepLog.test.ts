import { describe, expect, it } from "vitest";
import { nightMinutes, readSleepLog, sleepLogLines } from "../../copy";

const night = {
  bed: "22:45",
  wake: "06:45",
  awake: 30,
  quality: 4,
  week: [7, 7.5, 8, 6.5, 7, 8, 7.5],
};

describe("SleepLog copy", () => {
  it("handles same-day and overnight clocks without turning equal times into a day", () => {
    expect(nightMinutes("05:40", "06:10")).toBe(30);
    expect(nightMinutes("22:45", "06:45")).toBe(480);
    expect(nightMinutes("00:01", "00:00")).toBe(1439);
    expect(nightMinutes("06:45", "06:45")).toBe(0);
  });
  it("subtracts awake minutes and rounds the weekly average to the nearest minute", () => {
    expect(sleepLogLines(night)).toMatchObject({
      duration: "7 h 30 min",
      track: { at: 450, count: 480 },
      share: "94% asleep",
      awake: "30 min awake",
      average: "7 h 21 min",
      quality: "Good",
    });
    expect(sleepLogLines({ bed: "08:00", wake: "09:00" })).toMatchObject({
      duration: "1 h",
      track: { at: 60, count: 60 },
      awake: "0 min awake",
      average: undefined,
      quality: undefined,
    });
    expect(sleepLogLines({ ...night, awake: 480 }).duration).toBe("0 min");
    expect(sleepLogLines({ bed: "00:00", wake: "00:00" }).track).toEqual({ at: 0, count: 1 });
    expect(sleepLogLines({ ...night, week: Array(7).fill(0) }).average).toBe("0 min");
  });
  it("localizes the numbers and hides only the average from the brief reading", () => {
    expect(sleepLogLines(night, "fr").share).toBe("94\u00a0% asleep");
    expect(readSleepLog(night, true, "fr")).toContain("7-night average: 7 h 21 min (441 min)");
    expect(readSleepLog(night, false, "fr")).toEqual(
      readSleepLog(night, true, "fr").filter((line) => !line.startsWith("7-night average:")),
    );
  });
});

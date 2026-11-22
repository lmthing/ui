import { expect, it } from "vitest";
import { cardioMetrics, cardioReading, cardioSplits } from "../../copy";

const session = {
  activity: "run",
  distance: 5,
  elapsedSeconds: 1550,
  unit: "km",
  hrZone: 3,
  hrAvg: 151,
  elevation: 42,
  style: "summary",
  live: false,
  splits: [
    { label: "Km 1", seconds: 330 },
    { label: "Km 2", seconds: 300, elevationDelta: -12 },
  ],
} as const;

it("computes pace, ride speed and relative split lengths from the inputs", () => {
  expect(cardioMetrics(session).find(({ part }) => part === "pace")?.value).toBe("5:10 /km");
  expect(
    cardioMetrics({ ...session, activity: "ride", distance: 8, unit: "mi", elapsedSeconds: 1800 }).find(
      ({ part }) => part === "pace",
    )?.value,
  ).toBe("16 mph");
  expect(cardioMetrics({ ...session, distance: 0 }).some(({ part }) => part === "pace")).toBe(false);
  expect(cardioMetrics({ ...session, elapsedSeconds: 0 }).some(({ part }) => part === "pace")).toBe(false);
  expect(cardioSplits(session)).toMatchObject([
    { duration: "5:30", ratio: 300 / 330 },
    { duration: "5:00", ratio: 1, delta: "-12 m" },
  ]);
});

it("formats locale-sensitive figures and reads only the detail shown", () => {
  expect(cardioMetrics({ ...session, distance: 5.5 }, "fr")[0]?.value).toBe("5,5 km");
  expect(cardioReading(session, "filled")).toEqual([
    "Run",
    "Elapsed time: 25:50",
    "Distance: 5 km",
    "Avg pace: 5:10 /km",
    "Avg heart rate: 151 bpm",
    "Heart-rate zone: 3",
    "Elevation gain: 42 m",
    "Pace splits",
    "Km 1: 5:30",
    "Km 2: 5:00 · -12 m",
  ]);
  expect(cardioReading({ ...session, detail: "brief" }, "success")).toEqual([
    "Session saved",
    "Run",
    "Elapsed time: 25:50",
    "Distance: 5 km",
    "Avg pace: 5:10 /km",
    "Avg heart rate: 151 bpm",
    "Pace splits",
    "Km 1: 5:30",
    "Km 2: 5:00",
  ]);
});

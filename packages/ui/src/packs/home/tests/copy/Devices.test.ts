import { expect, it } from "vitest";
import { deviceLabels, deviceUnits } from "../../copy";

it("keeps device values, range warnings, lock confirmations and canonical units unchanged", () => {
  expect(deviceLabels).toEqual({
    reading: "Reading",
    setPoint: "Set point",
    normal: "Normal range",
    outOfRange: "Outside normal range",
    apply: "Apply scene",
    secure: "Apply scene, asks first",
    locked: "Locked",
    unlocked: "Unlocked",
  });
  expect(deviceUnits).toEqual({ celsius: "°C", percent: "%", ppm: "ppm", lux: "lux" });
});

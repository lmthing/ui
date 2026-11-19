import { expect, it } from "vitest";
import { deviceUnits, homeLabels } from "./home";

it("keeps household and canonical device labels in shared copy", () => {
  expect(Object.values(homeLabels).every((label) => label.trim().length > 0)).toBe(true);
  expect(deviceUnits).toEqual({ celsius: "°C", percent: "%", ppm: "ppm", lux: "lux" });
  expect(homeLabels.secure).toContain("asks first");
});

import { expect, it } from "vitest";
import { activityRingLine } from "../../copy";

it.each([
  [{ label: "Move", value: 280, of: 400, unit: "kcal" }, "Move: 280 of 400 kcal"],
  [{ label: "Steps", value: 8500, of: 8000, unit: "steps" }, "Steps: 8500 of 8000 steps"],
  [{ label: "Item one", value: 0, of: 1, unit: "0" }, "Item one: 0 of 1 0"],
  [{ label: "Water", value: 0.5, of: 8, unit: "glasses" }, "Water: 0.5 of 8 glasses"],
])("reads a labelled goal without rounding or clamping", (ring, expected) => {
  expect(activityRingLine(ring)).toBe(expected);
});

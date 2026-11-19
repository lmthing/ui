import { expect, it } from "vitest";
import { validateActionValue } from "./index";

it.each(["dismiss", "play", "pause", "flip", "send", "scan"])("%s takes no value", (action) => {
  expect(validateActionValue(action, undefined)).toBeNull();
  for (const value of [null, false, 0, "label"])
    expect(validateActionValue(action, value)?.code).toBe("invalid_value");
});
it.each([
  ["seek", 0, true],
  ["seek", 12.5, true],
  ["seek", "12", false],
  ["seek", NaN, false],
  ["seek", Infinity, false],
  ["seek", undefined, false],
  ["move", "Done", true],
  ["move", 1, false],
  ["move", undefined, false],
  ["unknown", undefined, false],
])("validates %s value %j", (action, value, valid) => {
  expect(validateActionValue(action as string, value) === null).toBe(valid);
});

it("requires a finite number even when no numeric bounds are declared", () => {
  expect(validateActionValue("set", "2026-11-19")).toBeNull();
  for (const value of ["1", NaN, Infinity, -Infinity, undefined, null])
    expect(validateActionValue("set", value, { numeric: true })?.code).toBe("invalid_value");
  expect(validateActionValue("set", 0.5, { numeric: true })).toBeNull();
});

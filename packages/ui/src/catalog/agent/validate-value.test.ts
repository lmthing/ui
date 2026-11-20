import { expect, it } from "vitest";
import { validateActionValue } from "./index";
import { resolveKeypadValue } from "./validate-value";

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
  expect(validateActionValue("set", "1", { type: "number" })?.code).toBe("invalid_value");
  expect(validateActionValue("set", 0.5, { type: "number" })).toBeNull();
});

it.each(["0004-02-29", "2000-02-29", "2024-02-29", "2026-12-31"])("accepts ISO date %s", (value) => {
  expect(validateActionValue("set", value, { type: "date" })).toBeNull();
});

it.each([
  "1900-02-29",
  "2026-02-29",
  "2026-02-30",
  "2026-04-31",
  "2026-01-00",
  "2026-13-01",
  "2024-2-29",
  "2024-02-29\n",
  "2024-02-29T00:00:00Z",
  20240229,
])("rejects invalid date %j", (value) => {
  expect(validateActionValue("set", value, { type: "date" })?.code).toBe("invalid_value");
});

it("checks one-sided date bounds inclusively", () => {
  const bound = "2024-02-29";
  expect(validateActionValue("set", bound, { type: "date", min: bound })).toBeNull();
  expect(validateActionValue("set", bound, { type: "date", max: bound })).toBeNull();
  expect(validateActionValue("set", "2024-02-28", { type: "date", min: bound })?.code).toBe("invalid_value");
  expect(validateActionValue("set", "2024-03-01", { type: "date", max: bound })?.code).toBe("invalid_value");
});

it("requires an exact string from a closed list", () => {
  const spec = { type: "choice", choices: ["ready", "1"] } as const;
  for (const value of spec.choices) expect(validateActionValue("set", value, spec)).toBeNull();
  for (const value of ["Ready", "ready ", "pending", "", 1, null])
    expect(validateActionValue("set", value, spec)?.code).toBe("invalid_value");
});

it.each([
  [{ append: "5" }, 12, {}, "125"],
  [{ append: "." }, 0, {}, "0."],
  [{ append: "." }, "", {}, "."],
  [{ backspace: true }, 0.0000001, {}, "0.000000"],
  [{ backspace: true }, "", {}, ""],
  [{ clear: true }, "12.50", {}, ""],
  ["000.20", "12", { max: 0.2, decimals: 2 }, "000.20"],
  ["99.99999999999999999", "", { max: 100 }, "99.99999999999999999"],
])("resolves keypad value %j from %j", (value, before, limits, expected) => {
  expect(resolveKeypadValue(value, before, limits)).toEqual({ value: expected });
});

it.each([
  [{ append: "01" }, "", {}],
  [{ append: "." }, "1.0", {}],
  [{ append: "1" }, "2.00", { decimals: 2 }],
  [{ append: "." }, "1", { decimals: 0 }],
  [{ append: "9" }, "2", { max: 8 }],
  [{ clear: true, backspace: true }, "2", {}],
  ["1.231", "", { decimals: 2 }],
  ["100.00000000000000001", "", { max: 100 }],
  ["0.1", "", { max: 0 }],
  ["-3", "", {}],
  ["1e2", "", {}],
  ["1\n", "", {}],
  ["9".repeat(400), "", {}],
  [3, "", {}],
])("rejects invalid keypad value %j from %j", (value, before, limits) => {
  expect(resolveKeypadValue(value, before, limits)).toMatchObject({ code: "invalid_value" });
});

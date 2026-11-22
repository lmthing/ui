import { expect, it } from "vitest";
import { nestedStepAt } from "./nested-step";

const spec = {
  action: "increment",
  prop: "value",
  min: "low",
  max: "high",
  step: "by",
} as const;

it("resolves each sub-item's bounds and step, sharing a key between directions only", () => {
  const row = { value: 6, low: 2, high: 8, by: 3 };
  const plus = nestedStepAt(spec, row, "r1", 0);
  const minus = nestedStepAt({ ...spec, action: "decrement" }, row, "r1", 0);
  expect(plus?.next).toBe(8);
  expect(minus?.next).toBe(3);
  expect(plus?.key).toBe(minus?.key);
  expect(nestedStepAt(spec, row, "r1", 1)?.key).not.toBe(plus?.key);
  expect(nestedStepAt(spec, row, "r2", 0)?.key).not.toBe(plus?.key);
});

it("does not step at a bound or with a missing, nonpositive or nonnumeric limit", () => {
  for (const row of [
    { value: 8, low: 2, high: 8, by: 3 },
    { value: 2, low: 2, high: 8, by: 0 },
    { value: 2, low: 2, high: 8, by: "3" },
    { value: 2, low: 2, by: 3 },
    { value: 2, low: 8, high: 2, by: 3 },
  ])
    expect(nestedStepAt(spec, row, "r1", 0)?.next).toBeUndefined();
});

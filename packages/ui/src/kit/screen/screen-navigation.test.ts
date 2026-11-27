import { expect, it } from "vitest";
import { captureTransition, hasTransition, takeTransition, type NavigationIntent } from "./screen-navigation";

function intent(expires: number): NavigationIntent {
  return {
    from: "queue",
    goto: "record",
    kind: "push",
    shared: undefined,
    ghost: undefined,
    agent: false,
    reduced: false,
    address: "queue/jobs/r1/root",
    scrollTop: 0,
    expires,
  };
}

it("spends the capture once, only at the intended destination", () => {
  const prepared = intent(Infinity);
  const capture = captureTransition(prepared);
  expect(takeTransition(capture, "other")).toBeUndefined();
  expect(hasTransition(capture, "record")).toBe(true);
  expect(takeTransition(capture, "record")).toBe(prepared);
  expect(hasTransition(capture, "record")).toBe(false);
  expect(takeTransition(capture, "record")).toBeUndefined();
});

it("does not replay an expired capture", () => {
  const capture = captureTransition(intent(0));
  expect(hasTransition(capture, "record")).toBe(false);
  expect(takeTransition(capture, "record")).toBeUndefined();
});

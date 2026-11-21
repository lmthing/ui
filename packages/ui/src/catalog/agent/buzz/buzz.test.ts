import { expect, it } from "vitest";
import { buzzKey, buzzRound, recordBuzz } from "./index";

it("keeps the first buzz and the first elapsed time for each item", () => {
  const first = recordBuzz(
    () => undefined,
    "r2",
    () => 12.25,
  );
  const second = recordBuzz(
    () => first,
    "r1",
    () => 15.5,
  );
  expect(
    recordBuzz(
      () => second,
      "r1",
      () => 100,
    ),
  ).toBe(second);
  expect(buzzRound((part) => (part === buzzKey ? second : undefined))).toEqual({
    winner: "r2",
    deltas: { r2: 0, r1: 3.25 },
  });
  expect(
    recordBuzz(
      () => second,
      "",
      () => 100,
    ),
  ).toBeUndefined();
});

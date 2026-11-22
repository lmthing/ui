import { expect, it, vi } from "vitest";
import { drawBatch, initialDeck } from "./deck";

it.each([1, 2, 3])("draws an unbiased batch of %i distinct positions", (count) => {
  const random = vi
    .fn()
    .mockReturnValueOnce(2 ** 32 - 1)
    .mockReturnValue(1);
  const initial = initialDeck(6);
  const batch = drawBatch(initial, 6, count, random);
  expect(batch).toEqual({
    kind: "deck",
    drawn: [1, 2, 3].slice(0, count),
    discard: [1, 2, 3].slice(0, count),
    remaining: 6 - count,
  });
  expect(random).toHaveBeenCalledTimes(count + 1);
  expect(initial).toEqual(initialDeck(6));
});

it("reveals the final short batch without replaying a discard", () => {
  const first = drawBatch(initialDeck(5), 5, 3, () => 0);
  const final = drawBatch(first, 5, 3, () => 0);
  expect(final).toEqual({ kind: "deck", drawn: [3, 4], discard: [0, 1, 2, 3, 4], remaining: 0 });
  expect(first).toMatchObject({ drawn: [0, 1, 2], discard: [0, 1, 2], remaining: 2 });
});

it.each([0, 1.5, 4])("rejects out-of-range batch size %d before consuming entropy", (count) => {
  const random = vi.fn(() => 0);
  expect(() => drawBatch(initialDeck(6), 6, count, random)).toThrow(RangeError);
  expect(random).not.toHaveBeenCalled();
});

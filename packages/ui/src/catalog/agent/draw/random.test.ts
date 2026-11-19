import { expect, it } from "vitest";
import { randomIndex } from "./random";

it("rejects the high tail before taking a remainder", () => {
  const words = [0xffff_ffff, 0xffff_fffe, 5];
  expect(randomIndex(6, () => words.shift()!)).toBe(5);
  expect(words).toEqual([]);
});

it("keeps six buckets approximately even with a fixed seed", () => {
  let seed = 123456789;
  const random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0);
  const counts = Array<number>(6).fill(0);
  for (let i = 0; i < 60000; i++) {
    const index = randomIndex(6, random);
    counts[index] = counts[index]! + 1;
  }
  for (const count of counts) expect(Math.abs(count - 10000)).toBeLessThan(300);
});

it("uses no entropy for a single possible result", () => {
  expect(
    randomIndex(1, () => {
      throw new Error("Unexpected entropy");
    }),
  ).toBe(0);
});

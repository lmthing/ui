import { expect, it } from "vitest";
import { nextPosition } from "./board-navigation";

const a = { row: 0, col: 1 };
const b = { row: 0, col: 3 };
const c = { row: 1, col: 3 };
const d = { row: 2, col: 1 };
const positions = [a, b, c, d];

it("moves along the current axis across gaps, without wrapping", () => {
  expect(nextPosition(positions, a, "ArrowRight")).toBe(b);
  expect(nextPosition(positions, b, "ArrowLeft")).toBe(a);
  expect(nextPosition(positions, b, "ArrowDown")).toBe(c);
  expect(nextPosition(positions, a, "ArrowDown")).toBe(d);
  expect(nextPosition(positions, d, "ArrowUp")).toBe(a);
  expect(nextPosition(positions, b, "ArrowRight")).toBeUndefined();
  expect(nextPosition(positions, a, "ArrowUp")).toBeUndefined();
  expect(nextPosition(positions, a, "Tab")).toBeUndefined();
});

it("moves to row endpoints, or grid endpoints with the Control modifier", () => {
  expect(nextPosition(positions, b, "Home")).toBe(a);
  expect(nextPosition(positions, a, "End")).toBe(b);
  expect(nextPosition(positions, c, "Home", true)).toBe(a);
  expect(nextPosition(positions, b, "End", true)).toBe(d);
  expect(nextPosition([], a, "Home", true)).toBeUndefined();
});

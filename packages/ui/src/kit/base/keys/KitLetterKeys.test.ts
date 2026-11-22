import { expect, it } from "vitest";
import { size } from "../../../catalog";
import { hivePositions, letterRows } from "./KitLetterKeys";

const keys = Array.from("QWERTYUIOPASDFGHJKLZXCVBNM", (label, i) => ({
  id: `r${i + 1}`,
  label,
  value: label.toLowerCase(),
  target: { part: "root" },
}));

it("lays out the supplied keyboard in QWERTY rows without dropping or duplicating a key", () => {
  expect(letterRows(keys).map((row) => row.map((key) => key.label).join(""))).toEqual([
    "QWERTYUIOP",
    "ASDFGHJKL",
    "ZXCVBNM",
  ]);
  expect(letterRows(keys.slice(0, 2)).flat()).toEqual(keys.slice(0, 2));
  expect(letterRows([])).toEqual([]);
});

it.each([false, true])("fits eight key targets without collisions (center: %s)", (center) => {
  const subset = keys.slice(0, 8).map((key, index) => ({ ...key, center: center && index === 3 }));
  const positions = hivePositions(subset);
  expect(positions.map(({ key }) => key)).toEqual(subset);
  expect(positions.filter((key) => key.center)).toEqual(
    center ? [{ key: subset[3], x: 0, y: 0, center }] : [],
  );
  positions.forEach((a, index) => {
    for (const b of positions.slice(index + 1)) {
      expect(Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y))).toBeGreaterThanOrEqual(size.control.md);
    }
  });
});

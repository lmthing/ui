import { expect, it } from "vitest";
import { layoutType, type as typography } from "..";

it("uses only five size and line-height steps, including legacy roles", () => {
  expect(Object.keys(layoutType)).toEqual(["title", "body", "meta", "figure", "caption"]);
  const metrics = ({ size, lineHeight }: (typeof typography)[keyof typeof typography]) => [size, lineHeight];
  const steps = Object.values(layoutType).map((role) => metrics(typography[role]));
  expect(steps).toEqual([
    [22, 28],
    [15, 21],
    [13, 18],
    [32, 36],
    [12, 16],
  ]);
  for (const role of Object.values(typography)) expect(steps).toContainEqual(metrics(role));
  expect(metrics(typography.display)).toEqual(metrics(typography.number));
  expect(metrics(typography.heading)).toEqual(metrics(typography.body));
});

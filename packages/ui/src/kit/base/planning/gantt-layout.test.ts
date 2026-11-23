import { expect, it } from "vitest";
import { component, size, space } from "../../../catalog";
import {
  dependency,
  hitBox,
  laneHeight,
  minimumColumn,
  milestone,
  range,
  rangeContinuation,
  timelineEdges,
  timelineWidth,
} from "./gantt-layout";

const width = minimumColumn * 4;

it("fills the window with whole columns at both scroll limits", () => {
  expect(timelineWidth(5, width / 2 + space.md)).toBe((width / 2 + space.md) * 2.5);
  expect(timelineWidth(3, width)).toBe(width);
  expect(timelineWidth(5, 0)).toBe(minimumColumn * 5);
});

it("indicates only directions with more dates, and only bars intersecting a viewport edge", () => {
  const viewport = width / 2;
  const bar = range(0.1, 0.9, width);
  const start = timelineEdges(width, viewport, 0);
  expect(start).toMatchObject({ left: false, right: true });
  expect(rangeContinuation(bar, start)).toEqual({ left: false, right: true });
  expect(rangeContinuation(range(0.6, 0.9, width), start)).toEqual({ left: false, right: false });
  expect(rangeContinuation(range(0, 0.5, width), start)).toEqual({ left: false, right: false });
  const middle = timelineEdges(width, viewport, width / 4);
  expect(rangeContinuation(bar, middle)).toEqual({ left: true, right: true });
  const end = timelineEdges(width, viewport, width);
  expect(end).toMatchObject({ left: true, right: false, end: width });
  expect(rangeContinuation(bar, end)).toEqual({ left: true, right: false });
  expect(timelineEdges(width, width, width)).toMatchObject({ left: false, right: false });
});

it("preserves normalized endpoints, clips out-of-range data and keeps zero-length bars visible", () => {
  expect(range(0.25, 0.75, width)).toEqual({ left: width / 4, width: width / 2 });
  expect(range(-0.1, 1.1, width)).toEqual({ left: 0, width });
  expect(range(1, 1, width)).toEqual({
    left: width - component.base.strongBorder,
    width: component.base.strongBorder,
  });
});

it("keeps edge milestones and their full touch targets inside the timeline", () => {
  expect(milestone(0.5, width)).toBe(width / 2);
  expect(milestone(0, width)).toBe(space.sm / Math.SQRT2);
  expect(milestone(1, width)).toBeCloseTo(width - space.sm / Math.SQRT2);
  expect(milestone(0.05, minimumColumn)).toBeGreaterThan(milestone(0, minimumColumn));
  expect(milestone(0.95, minimumColumn)).toBeLessThan(milestone(1, minimumColumn));
  expect(hitBox(milestone(0, width), width)).toEqual({ left: 0, width: size.control.md });
  expect(hitBox(milestone(1, width), width)).toEqual({
    left: width - size.control.md,
    width: size.control.md,
  });
});

it("connects the source bar's end to the destination lane in either direction", () => {
  const a = { left: 10, width: 30, index: 0 };
  const b = { left: 20, width: 30, index: 1 };
  expect(dependency(a, b, width, [])).toMatch(
    new RegExp(`^M40 ${laneHeight * 1.5 + space.sm} V.* H.* V${laneHeight * 2.5 - space.sm} `),
  );
  expect(dependency(b, a, width, [])).toMatch(
    new RegExp(`^M50 ${laneHeight * 2.5 - space.sm} V.* H.* V${laneHeight * 1.5 + space.sm} `),
  );
});

it("takes a clear channel beside intervening bars", () => {
  const a = { left: 24, width: 40, index: 0 };
  const b = { left: 74, width: 63, index: 1 };
  const c = { left: 42, width: 63, index: 2 };
  const d = { left: 90, width: 63, index: 3 };
  expect(dependency(a, d, width, [b, c])).toContain(`H${c.left - space.xs} V`);
});

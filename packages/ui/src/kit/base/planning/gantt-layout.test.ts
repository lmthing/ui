import { expect, it } from "vitest";
import { component, size, space } from "../../../catalog";
import {
  dependency,
  hitBox,
  laneHeight,
  minimumColumn,
  milestone,
  range,
  timelineWidth,
} from "./gantt-layout";

const width = minimumColumn * 4;

it("fills the window with whole columns at both scroll limits", () => {
  expect(timelineWidth(5, width / 2 + space.md)).toBe((width / 2 + space.md) * 2.5);
  expect(timelineWidth(3, width)).toBe(width);
  expect(timelineWidth(5, 0)).toBe(minimumColumn * 5);
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
  expect(milestone(0, width)).toBe(0);
  expect(milestone(1, width)).toBe(width);
  expect(milestone(0.125, minimumColumn)).toBe(range(0.125, 0.5, minimumColumn).left);
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

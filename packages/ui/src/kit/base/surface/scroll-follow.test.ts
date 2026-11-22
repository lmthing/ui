import { expect, it, vi } from "vitest";
import {
  manualScrollActive,
  measureNativeOffset,
  nearestScrollDelta,
  revealNativePart,
} from "./scroll-follow";

it.each([
  [20, 60, 100, 0],
  [-30, 10, 100, -30],
  [90, 130, 100, 30],
  [-20, 120, 100, 0],
  [-100, 30, 100, -70],
  [70, 200, 100, 70],
  [5, 20, 0, 0],
])("reveals [%s, %s] in a viewport of %s by moving %s", (start, end, extent, delta) => {
  expect(nearestScrollDelta(start, end, extent)).toBe(delta);
});

it("gives precedence to manual drag, momentum and the interval after the latest input", () => {
  const idle = { dragging: false, momentum: false, lastManual: -Infinity };
  expect(manualScrollActive(idle, 0)).toBe(false);
  expect(manualScrollActive({ ...idle, dragging: true }, 10_000)).toBe(true);
  expect(manualScrollActive({ ...idle, momentum: true }, 10_000)).toBe(true);
  expect(manualScrollActive({ ...idle, lastManual: 10 }, 209)).toBe(true);
  expect(manualScrollActive({ ...idle, lastManual: 10 }, 210)).toBe(false);
});

it.each([
  [false, false, { x: 40, y: 130, animated: false }],
  [true, true, { x: 60, y: 40, animated: true }],
] as const)(
  "measures against native scroll content and moves only the requested axis",
  (axis, animated, expected) => {
    const content = {};
    const scroll = { getInnerViewRef: () => content, scrollTo: vi.fn() };
    const target = {
      measureLayout: vi.fn((_parent, done: (...box: number[]) => void) => done(120, 180, 40, 50)),
    };
    const stop = revealNativePart(scroll, target, axis, animated, () => ({
      offset: { x: 40, y: 40 },
      extent: 100,
    }));
    expect(target.measureLayout).toHaveBeenCalledWith(content, expect.any(Function), expect.any(Function));
    expect(scroll.scrollTo).toHaveBeenCalledExactlyOnceWith(expected);
    if (animated) {
      stop?.({ x: 50, y: 65 });
      expect(scroll.scrollTo).toHaveBeenLastCalledWith({ x: 50, y: 65, animated: false });
    }
  },
);

it("does not use an outstanding native measurement after the request is invalidated", () => {
  const scroll = { getInnerViewRef: () => ({}), scrollTo: vi.fn() };
  let measured: ((...box: number[]) => void) | undefined;
  let current = true;
  revealNativePart(
    scroll,
    {
      measureLayout: (_parent, done) => {
        measured = done;
      },
    },
    false,
    false,
    () => (current ? { offset: { x: 0, y: 0 }, extent: 100 } : undefined),
  );
  current = false;
  measured!(0, 180, 40, 50);
  expect(scroll.scrollTo).not.toHaveBeenCalled();
});

it("seeds both native offsets from the live viewport and content before the first scroll event", () => {
  type Measure = (x: number, y: number) => void;
  let viewport!: Measure, content!: Measure;
  const measured = vi.fn();
  measureNativeOffset(
    {
      getNativeScrollRef: () => ({
        measureInWindow: (done) => {
          viewport = done;
        },
      }),
      getInnerViewRef: () => ({
        measureInWindow: (done) => {
          content = done;
        },
      }),
    },
    measured,
  );
  content(-10, -150);
  expect(measured).not.toHaveBeenCalled();
  viewport(20, 50);
  expect(measured).toHaveBeenCalledExactlyOnceWith({ x: 30, y: 200 });
});

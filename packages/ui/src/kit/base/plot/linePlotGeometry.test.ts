import { describe, expect, it } from "vitest";
import { bandPath, plotGeometry, plotPaths, type Point } from "./linePlotGeometry";

const points: Point[] = [
  { id: "a", x: 10, value: -5, label: "First" },
  { id: "b", x: 20, value: 0, label: "Middle" },
  { id: "c", x: 30, value: 5, label: "Last" },
];
describe("line plot geometry", () => {
  it("scales numeric x and signed readings together with the goal", () => {
    const geometry = plotGeometry([{ id: "one", label: "One", points }], { value: 15, label: "Goal" });
    expect(geometry.ticks).toEqual([15, 5, -5]);
    expect([geometry.x(10), geometry.x(20), geometry.x(30)]).toEqual([0, 0.5, 1]);
    expect([geometry.y(-5), geometry.y(5), geometry.y(15)]).toEqual([1, 0.5, 0]);
    expect([geometry.first, geometry.last]).toEqual(["First", "Last"]);
    expect(geometry.empty).toBe(false);
  });
  it("centres flat and single-point series and keeps zero readings", () => {
    for (const value of [0, -3, 3]) {
      const geometry = plotGeometry([{ id: "one", label: "One", points: [{ ...points[0]!, value }] }]);
      expect([geometry.x(10), geometry.y(value)]).toEqual([0.5, 0.5]);
      expect(geometry.empty).toBe(false);
      expect(geometry.ticks).toEqual([value]);
      expect(geometry.last).toBeUndefined();
    }
  });
  it("breaks at missing and invalid readings instead of bridging them", () => {
    const samples = [points[0]!, { ...points[1]!, value: null }, points[2]!];
    expect(
      plotPaths(
        samples,
        (x) => x,
        (y) => y,
      ),
    ).toBe("M10,-5 M30,5");
    expect(
      plotPaths(
        points,
        (x) => x,
        (y) => y,
      ),
    ).toBe("M10,-5 L20,0 L30,5");
    expect(
      plotPaths(
        [
          { ...points[0]!, x: NaN },
          { ...points[1]!, value: Infinity },
        ],
        (x) => x,
        (y) => y,
      ),
    ).toBe("");
  });
  it("keeps empty geometry finite even with missing readings and an invalid goal", () => {
    for (const samples of [[], points.map((point) => ({ ...point, value: null }))]) {
      const geometry = plotGeometry([{ id: "one", label: "One", points: samples }], {
        value: NaN,
        label: "Goal",
      });
      expect(geometry.empty).toBe(true);
      expect(geometry.ticks.every(Number.isFinite)).toBe(true);
    }
  });
});
describe("reference overlays", () => {
  it("scales the first series grid, the band, and a zero baseline together", () => {
    const series = [{ id: "one", label: "One", points: points.map((p) => ({ ...p, value: 5 })) }];
    const geometry = plotGeometry(series, undefined, { low: [1, 2, 3], high: [8, 10, 12] }, 0);
    expect(geometry.ticks).toEqual([12, 6, 0]);
    expect(geometry.y(0)).toBe(1);
    expect(
      bandPath(
        geometry.bands[0]!,
        (x) => x,
        (y) => y,
      ),
    ).toBe("M10,8 L20,10 L30,12 L30,3 L20,2 L10,1 Z");
    expect(plotGeometry(series, undefined, undefined, NaN).ticks).toEqual([5]);
  });
  it("does not bridge missing, inverted, or nonfinite bounds", () => {
    const expanded = Array.from({ length: 9 }, (_, i) => ({
      id: `${i}`,
      label: `${i}`,
      x: i,
      value: i ? null : 0,
    }));
    const geometry = plotGeometry([{ id: "one", label: "One", points: expanded }], undefined, {
      low: [0, 1, NaN, 3, 4, 6, 6, 7, 8],
      high: [2, 3, 4, 5, 6, 5, 7, 8],
    });
    expect(geometry.bands.map((run) => run.map(({ x }) => x))).toEqual([
      [0, 1],
      [3, 4],
      [6, 7],
    ]);
    expect(geometry.ticks).toEqual([8, 4, 0]);
  });
});

it("does not scale to an isolated band sample that cannot draw an area", () => {
  const series = [{ id: "one", label: "One", points }];
  const partial = plotGeometry(series, undefined, { low: [NaN, -1000], high: [NaN, 1000] });
  expect(partial.bands).toEqual([]);
  expect(partial.ticks).toEqual(plotGeometry(series).ticks);
});

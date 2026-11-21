import { describe, expect, it } from "vitest";
import { chartPoints, chartTicks, pointReading, pointValue } from "../../copy";

describe("LineChart copy and point mapping", () => {
  it("gives each series unique, consecutive addresses while sharing x positions", () => {
    const points = chartPoints({
      labels: ["Mon", "Tue"],
      series: [
        { label: "First", values: [1, 2] },
        { label: "Second", values: [-1.5, 0] },
      ],
    });
    expect(points.map(({ id, x }) => [id, x])).toEqual([
      ["r1", 0],
      ["r2", 1],
      ["r3", 0],
      ["r4", 1],
    ]);
    expect(pointReading(points[2]!, "kg", "de-DE")).toBe("r3 Second · Mon · -1,5 kg");
    expect(pointValue(0, undefined, "de-DE")).toBe("0");
    expect(chartTicks(points, "de-DE")).toEqual(["2", "0,25", "-1,5"]);
    expect(chartTicks([{ value: 0 }, { value: 0 }])).toEqual(["0"]);
  });
});

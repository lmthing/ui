import { expect, it } from "vitest";
import { performancePointCopy, performanceReading } from "../../copy";

const point = { id: "r1", at: "2026-01-01T23:30:00-02:00", value: null, contributed: 1250, gain: null };

it("uses UTC labels, app currency and an explicit unknown for unavailable amounts", () => {
  expect(performancePointCopy(point, "en-GB", "GBP")).toMatchObject({
    day: "2 Jan",
    value: "Unknown",
    contributed: "£1,250",
    gain: "Unknown",
  });
  expect(performancePointCopy({ ...point, gain: -10.5 }, "en-GB", "GBP")).toMatchObject({
    gain: "-£10.50",
    tone: "bad",
  });
});

it("reads every observation and uses the same selected summary as the view", () => {
  expect(performanceReading({ samples: [point], selected_point: point.at }).join(" ")).toContain(
    "Selected valuation",
  );
  const brief = performanceReading({ samples: [point], detail: "brief" }).join(" ");
  expect(brief).not.toContain("Latest valuation");
  expect(brief).toContain("Portfolio value Unknown");
  expect(brief).toContain(point.at);
  expect(performanceReading({ samples: [point] }, "en-GB", "GBP")).toContain("GBP");
  expect(performanceReading({ samples: [{ ...point, contributed: null }] })).not.toContain("USD");
});

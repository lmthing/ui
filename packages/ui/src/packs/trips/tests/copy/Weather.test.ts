import { describe, expect, it } from "vitest";
import { weatherCopy, weatherReading } from "../../copy";

const request = { place: "Oslo", from: "2027-03-04" };
const today = { condition: "cloudy", high: 2, low: -4 };
const data = {
  weather: [
    {
      ...request,
      kind: "forecast",
      today,
      next: [
        { ...today, date: "2027-03-05", rain: 59 },
        { ...today, date: "2027-03-06", condition: "rain", rain: 60 },
      ],
    },
  ],
};

describe("Weather copy", () => {
  it("localizes dates, percentages and signed numbers, and warns at 60%", () => {
    const copy = weatherCopy(request, data, "fr-FR");
    expect(copy.heading).toBe("Forecast");
    expect(copy.summary?.range).toBe("2° / -4°");
    expect(copy.next?.map(({ label, rain, warn }) => [label, rain, warn])).toEqual([
      ["ven.", "59\u00a0% rain", false],
      ["sam.", "60\u00a0% rain", true],
    ]);
  });

  it("does not read hidden summary text in brief or match a different place or date", () => {
    expect(weatherReading(request, data)[1]).toBe("Today · High 2°, low -4° Celsius · Cloudy");
    expect(weatherReading({ ...request, detail: "brief" }, data)[1]).toBe("Today · High 2°, low -4° Celsius");
    expect(weatherCopy({ ...request, place: "Rome" }, data).notice?.title).toBe("Weather unavailable");
    expect(weatherCopy({ ...request, from: "2027-04-01" }, data).notice?.title).toBe("Weather unavailable");
  });

  it("does not draw malformed, inverted or out-of-range service data", () => {
    const record = data.weather[0]!;
    for (const value of [
      { ...record, today: { ...today, low: 8 } },
      { ...record, next: [{ ...today, date: "2027-03-05", rain: 101 }] },
      { ...record, next: Array.from({ length: 7 }, () => record.next[0]) },
      { ...record, next: [{ ...today, date: "2027-02-29", rain: 10 }] },
    ]) {
      expect(weatherCopy(request, { weather: [value] }).notice?.title).toBe("Weather unavailable");
    }
  });

  it("localizes the named period, and distinguishes an offline answer", () => {
    const typical = { ...request, kind: "typical", month: request.from, summary: today };
    expect(weatherCopy(request, { weather: [typical] }, "es-ES").heading).toBe("Typical weather in marzo");
    expect(weatherCopy(request, { weather: [{ ...request, kind: "offline" }] }).notice?.icon).toBe("wifi");
  });
});

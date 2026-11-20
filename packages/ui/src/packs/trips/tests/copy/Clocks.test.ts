import { describe, expect, it } from "vitest";
import { clockReadings } from "../../copy";

const place = (zone: string) => ({ label: zone, zone });
const at = (date: string, zones: string[], lang?: string) =>
  clockReadings(zones.map(place), new Date(date), lang);

describe("Clocks copy", () => {
  it("compares the same instant on either side of midnight and keeps fractional offsets", () => {
    const zones = ["America/New_York", "Asia/Kathmandu", "America/Los_Angeles", "America/Toronto"];
    expect(at("2026-01-01T03:05:00Z", zones)).toMatchObject([
      { time: "22:05", offset: "Home", isDay: false },
      { time: "08:50", offset: "+10 h 45 min", isDay: true },
      { time: "19:05", offset: "−3 h", isDay: false },
      { time: "22:05", offset: "0 h", isDay: false },
    ]);
  });

  it("uses each zone's calendar date instead of wrapping large differences at 24 hours", () => {
    expect(at("2026-01-01T10:15:00Z", ["Pacific/Honolulu", "Pacific/Auckland"])).toMatchObject([
      { time: "00:15", offset: "Home" },
      { time: "23:15", offset: "+23 h" },
    ]);
  });

  it.each([
    ["2026-03-08T06:59:59Z", "01:59", "−5 h"],
    ["2026-03-08T07:00:00Z", "03:00", "−4 h"],
  ])("uses the destination's current DST rule at %s", (date, time, offset) => {
    expect(at(date, ["Europe/London", "America/New_York"])[1]).toMatchObject({ time, offset });
  });

  it.each([
    ["05:59", false],
    ["06:00", true],
    ["17:59", true],
    ["18:00", false],
  ])("sets the local day indicator at %s", (time, isDay) => {
    expect(at(`2026-01-01T${time}:00Z`, ["Etc/UTC"])[0]).toMatchObject({ time, isDay });
  });

  it("formats both the clock and minute-only offsets in the requested locale", () => {
    expect(at("2026-01-01T00:00:00Z", ["Asia/Kolkata", "Asia/Kathmandu"], "ar-EG")[1]).toMatchObject({
      time: "٠٥:٤٥",
      offset: "+١٥ min",
    });
  });
});

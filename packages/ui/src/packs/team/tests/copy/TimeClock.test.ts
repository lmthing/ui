import { describe, expect, it } from "vitest";
import { clockLine, numberLine, timeOfDayLine } from "@lmthing/ui/catalog";
import { timeClockDisplay, timeClockReading } from "../../copy";

const dayStart = Date.UTC(2026, 10, 20);
const at = (minutes: number) => dayStart + minutes * 60_000;
type Event = { at: number; kind: string };
const data = (events: Event[]) => ({ shiftClock: [{ asOf: at(135), dayStart, events }] });
const events = [
  { at: at(-60), kind: "in" },
  { at: at(-20), kind: "break_start" },
  { at: at(0), kind: "break_end" },
  { at: at(75), kind: "break_start" },
];

describe("TimeClock display and reading", () => {
  it("counts breaks that started today and measures an overnight shift from the real timestamp", () => {
    const input = { on: true, since: "23:00" };
    const lang = "ar";
    const line = timeClockDisplay(input, "filled", data(events), lang);
    expect(line).toMatchObject({
      status: "On break",
      since: `Clocked in at ${timeOfDayLine("23:00", lang)}`,
      elapsed: clockLine(195 * 60, lang),
      breaks: `${numberLine(1, lang)} break today`,
      clockAction: "Clock out",
      breakAction: "End break",
    });
    expect(timeClockReading(input, "filled", lang, data(events))).toContain(line.breaks);
  });

  it("freezes a completed shift at clock-out, including when the worker clocks out on a break", () => {
    const closed = data([...events, { at: at(120), kind: "out" }]);
    expect(timeClockDisplay({ on: false }, "success", closed)).toMatchObject({
      status: "Clocked out",
      elapsed: "3:00:00",
      breaks: "1 break today",
      clockAction: undefined,
      breakAction: undefined,
    });
    expect(timeClockDisplay({ on: false }, "filled", closed)).toMatchObject({
      status: "Off shift",
      elapsed: undefined,
      breaks: "1 break today",
      clockAction: "Clock in",
    });
  });

  it("counts today's breaks across completed and active shifts and distinguishes a known zero", () => {
    const prior = [
      ...events,
      { at: at(90), kind: "out" },
      { at: at(95), kind: "in" },
      { at: at(105), kind: "break_start" },
      { at: at(110), kind: "break_end" },
    ];
    expect(timeClockDisplay({ on: true }, "filled", data(prior))).toMatchObject({
      elapsed: "40:00",
      breaks: "2 breaks today",
      breakAction: "Start break",
    });
    expect(timeClockDisplay({ on: false }, "filled", data([])).breaks).toBe("0 breaks today");
  });
});

describe("TimeClock invalid snapshots", () => {
  it.each([
    {},
    data([{ at: at(25), kind: "break_start" }]),
    data([{ at: at(136), kind: "in" }]),
    data([
      { at: at(25), kind: "in" },
      { at: at(24), kind: "break_start" },
    ]),
    data([
      { at: at(25), kind: "in" },
      { at: at(30), kind: "out" },
    ]),
    data([...events, { at: at(90), kind: "break_start" }]),
  ])("does not invent metrics for missing, invalid or stale host events", (records) => {
    expect(timeClockDisplay({ on: true }, "filled", records)).toMatchObject({
      status: "On shift",
      elapsed: undefined,
      breaks: undefined,
      breakAction: "Start break",
    });
  });
});

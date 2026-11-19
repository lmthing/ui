import { expect, it } from "vitest";
import { countdownOf, kitchenTimerMore, kitchenTimerOrder, kitchenTimerReading } from "../../copy";

it("orders live times without changing ids, tie order, or the input", () => {
  const timers = [
    { id: "r1", label: "First", seconds: 90 },
    { id: "r2", label: "Second", seconds: 30, remaining: 90 },
    { id: "r3", label: "Third", seconds: 60, remaining: 0 },
  ];
  expect(kitchenTimerOrder(timers).map(({ id }) => id)).toEqual(["r3", "r1", "r2"]);
  expect(timers.map(({ id }) => id)).toEqual(["r1", "r2", "r3"]);
  expect(countdownOf(timers[2]!)).toBe(0);
  expect(kitchenTimerReading(timers)).toEqual([
    "Third: 0:00",
    "First: 1:30",
    "Second: 1:30",
    '"Start"',
    '"Done"',
    '"+1 min"',
  ]);
});

it("passes the locale to countdowns and the add-minute label", () => {
  const lang = "en-u-nu-arab";
  expect(kitchenTimerReading([{ label: "First", seconds: 3661 }], lang)).toEqual([
    "First: ١:٠١:٠١",
    '"Start"',
    '"+١ min"',
  ]);
  expect(kitchenTimerMore(lang)).toBe("+١ min");
});

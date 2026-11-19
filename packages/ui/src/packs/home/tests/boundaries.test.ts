import { expect, it } from "vitest";
import { components } from "@lmthing/ui/catalog";

it("accepts exact household count, text, date and number boundaries", () => {
  const chore = {
    title: "x".repeat(28),
    who: "x".repeat(16),
    repeat: "yearly",
    every: 12,
    points: 100,
    last: "2028-02-29",
    goto: "detail",
  };
  expect(components.Chores.props.safeParse({ chores: Array.from({ length: 6 }, () => chore) }).success).toBe(
    true,
  );
  expect(components.Chores.props.safeParse({ chores: [{ ...chore, every: 1, points: 0 }] }).success).toBe(
    true,
  );
  const task = {
    title: "x".repeat(24),
    for: "x".repeat(16),
    icon: "check",
    repeat: "daily",
    every: 12,
    last: "2028-02-29",
    goto: "detail",
  };
  expect(
    components.CareSchedule.props.safeParse({ tasks: Array.from({ length: 12 }, () => task) }).success,
  ).toBe(true);
  expect(
    components.Rewards.props.safeParse({
      kids: Array.from({ length: 4 }, () => ({ name: "x".repeat(16), points: 100, goto: "detail" })),
      prizes: Array.from({ length: 6 }, () => ({ title: "x".repeat(24), cost: 100, icon: "star" })),
      money: true,
    }).success,
  ).toBe(true);
  expect(
    components.Turns.props.safeParse({
      job: "x".repeat(24),
      people: Array.from({ length: 6 }, () => ({ name: "x".repeat(16) })),
      at: 5,
    }).success,
  ).toBe(true);
});

it("checks the maximum seven-day family agenda and twelve-entry baby log", () => {
  const event = {
    title: "x".repeat(32),
    time: "23:59",
    who: Array.from({ length: 4 }, () => "x".repeat(12)),
  };
  const days = Array.from({ length: 7 }, (_, index) => ({
    date: `2026-11-${20 + index}`,
    events: Array.from({ length: 6 }, () => event),
  }));
  expect(components.Agenda.props.safeParse({ days, goto: "add_event" }).success).toBe(true);
  expect(components.Agenda.props.safeParse({ days: [...days, days[0]], goto: "add_event" }).success).toBe(
    false,
  );
  expect(
    components.Agenda.props.safeParse({
      days: [{ date: "2026-11-20", events: [...days[0]!.events, event] }],
      goto: "add_event",
    }).success,
  ).toBe(false);
  expect(
    components.Agenda.props.safeParse({
      days: [{ date: "2026-11-20", events: [{ ...event, who: [...event.who, "Sam"] }] }],
      goto: "add_event",
    }).success,
  ).toBe(false);
  expect(
    components.BabyLog.props.safeParse({
      log: Array.from({ length: 12 }, () => ({
        kind: "bottle",
        time: "00:00",
        minutes: 0,
        amount: "x".repeat(10),
      })),
      running: "none",
    }).success,
  ).toBe(true);
});

import { expect, it } from "vitest";
import { careLabels, careLines, careTaskLabel, careToday, nextCareDate } from "../../copy";

it.each([
  { last: "2026-11-19", repeat: "never", every: 1, next: undefined },
  { last: "2026-11-19", repeat: "daily", every: 12, next: "2026-12-01" },
  { last: "2026-11-20", repeat: "weekdays", every: 1, next: "2026-11-23" },
  { last: "2026-11-21", repeat: "weekdays", every: 3, next: "2026-11-25" },
  { last: "2026-11-05", repeat: "weekly", every: 2, next: "2026-11-19" },
  { last: "2026-01-31", repeat: "monthly", every: 1, next: "2026-02-28" },
  { last: "2027-12-31", repeat: "monthly", every: 2, next: "2028-02-29" },
  { last: "2024-02-29", repeat: "yearly", every: 1, next: "2025-02-28" },
  { last: "2024-02-29", repeat: "yearly", every: 4, next: "2028-02-29" },
  { last: "9999-12-31", repeat: "daily", every: 1, next: undefined },
] as const)("advances $last by $every $repeat", ({ next, ...seed }) => {
  expect(nextCareDate(seed)).toBe(next);
});

it("distinguishes overdue, due today, upcoming and one-off care", () => {
  const seed = { last: "2026-11-05", repeat: "weekly", every: 2 } as const;
  expect(careLines(seed, "2026-11-20")).toEqual({
    repeat: "Every 2 weeks",
    last: "Last 5\u00a0Nov\u00a026",
    next: "Late 19\u00a0Nov\u00a026",
    tone: "bad",
  });
  expect(careLines(seed, "2026-11-19")).toMatchObject({ next: careLabels.today, tone: "accent" });
  expect(careLines(seed, "2026-11-18")).toMatchObject({ next: "Next 19\u00a0Nov\u00a026", tone: "muted" });
  expect(careLines({ ...seed, repeat: "never" })).toMatchObject({
    repeat: "Does not repeat",
    next: "No next date",
    tone: "muted",
  });
});

it("uses the viewer's local calendar day and names the optional care subject", () => {
  expect(careToday(new Date(2026, 0, 1, 0, 1))).toBe("2026-01-01");
  expect(careTaskLabel({ title: "Water", for: "Fern" })).toBe("Water · Fern");
  expect(careTaskLabel({ title: "Water" })).toBe("Water");
});

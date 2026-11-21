import { describe, expect, it } from "vitest";
import { leaseCopy, leaseReading, leaseSchedule } from "../../copy";

const start = "2024-01-01";
const end = "2024-03-31";
const terms = { start, end, per: "month", due: 31 } as const;
const record = {
  ...terms,
  place: "Patio flat",
  tenant: "Ana",
  detail: "full",
  rent: 950,
  deposit: 0,
} as const;
const day = (month: number, date: number, year = 2024) => new Date(year, month - 1, date, 12);

describe("leaseSchedule", () => {
  it("clamps a monthly date within each month, stays due on the day, and rolls into the next year", () => {
    expect(leaseSchedule(terms, day(2, 28)).nextDue).toBe("2024-02-29");
    expect(leaseSchedule(terms, day(2, 29)).nextDue).toBe("2024-02-29");
    expect(leaseSchedule(terms, day(3, 1)).nextDue).toBe(end);
    const longer = { ...terms, start: "2023-12-01", due: 12 };
    expect(leaseSchedule(longer, day(12, 31, 2023)).nextDue).toBe("2024-01-12");
  });

  it("handles February in a non-leap year and never moves a date past the end", () => {
    const nextYear = { ...terms, start: "2025-01-01", end: "2025-02-28" };
    expect(leaseSchedule(nextYear, day(2, 1, 2025)).nextDue).toBe("2025-02-28");
    expect(leaseSchedule({ ...terms, end: "2024-03-30" }, day(3, 1)).nextDue).toBeUndefined();
    expect(leaseSchedule(terms, day(4, 1)).nextDue).toBeUndefined();
  });

  it("uses ISO weekdays for weekly rent, including the stored range above seven", () => {
    const weekly = { ...terms, per: "week" } as const;
    expect(leaseSchedule({ ...weekly, due: 1 }, day(1, 1)).nextDue).toBe(start);
    expect(leaseSchedule({ ...weekly, due: 1 }, day(1, 2)).nextDue).toBe("2024-01-08");
    expect(leaseSchedule({ ...weekly, due: 7 }, day(1, 2)).nextDue).toBe("2024-01-07");
    expect(leaseSchedule({ ...weekly, due: 31 }, day(1, 2)).nextDue).toBe("2024-01-03");
  });

  it("never schedules rent before the term and clamps the time-left fill", () => {
    expect(leaseSchedule(terms, day(12, 15, 2023))).toMatchObject({ ratio: 1, nextDue: "2024-01-31" });
    expect(leaseSchedule(terms, day(2, 15))).toMatchObject({ daysLeft: 45, ratio: 0.5, status: "soon" });
    expect(leaseSchedule(terms, day(2, 14)).status).toBeUndefined();
    expect(leaseSchedule(terms, day(3, 31))).toMatchObject({
      daysLeft: 0,
      ratio: 0,
      status: "endsToday",
      nextDue: end,
    });
    expect(leaseSchedule(terms, day(4, 1))).toMatchObject({ daysLeft: 0, ratio: 0, status: "ended" });
  });
});

describe("lease copy and reading", () => {
  it("formats the civil dates, amount and zero deposit for the requested language tag", () => {
    const copy = leaseCopy(record, "en-GB", day(3, 30));
    expect(copy).toMatchObject({
      start: "Starts 1 Jan 2024",
      end: "Ends 31 Mar 2024",
      nextDue: "Next due 31 Mar 2024",
      rent: ["Rent ", "US$950", "\u00a0/\u00a0month"],
      deposit: "Deposit US$0",
      remaining: "1 day",
      renewal: "Renewal soon",
    });
  });

  it("keeps the agreement reading in visual order without leaking the hidden terms", () => {
    expect(leaseReading({ ...record, detail: "brief" }, "en-US", day(3, 31))).toEqual([
      "Patio flat",
      "Tenant: Ana",
      "Ends Mar 31, 2024",
      "Time left: 0 days",
      "Lease ends today",
      "Rent $950\u00a0/\u00a0month",
      "Next due Mar 31, 2024",
    ]);
  });
});

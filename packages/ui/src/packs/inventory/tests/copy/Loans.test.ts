import { describe, expect, it } from "vitest";
import { loanDates, loanReading, loanToday } from "../../copy";

const since = "2024-02-29";
const today = "2024-03-02";

describe("loan dates", () => {
  it("uses the device's civil date", () => {
    expect(loanToday(new Date(2024, 1, 29, 23, 59))).toBe(since);
  });

  it("warns only for days strictly before today", () => {
    expect(loanDates({ since, due: "2024-03-01" }, "full", "en", today)).toEqual({
      since: "Since 29 Feb 2024",
      due: "Due back 1 Mar 2024",
      overdue: "Overdue",
    });
    for (const due of [undefined, today, "2024-03-03"])
      expect(loanDates({ since, due }, "full", "en", today).overdue).toBeUndefined();
    expect(loanDates({ since }, "full", "en", today).due).toBeUndefined();
  });

  it("formats in the app language and omits only the start date in brief readings", () => {
    expect(loanDates({ since }, "full", "en-US", today).since).toBe("Since Feb 29, 2024");
    const loans = [
      { since, due: "2024-03-01", person: "Ana", way: "lent" as const },
      { since, person: "Sam", way: "borrowed" as const },
    ];
    expect(loanReading({ loans, detail: "brief" }, "en", today)).toEqual([
      "r1 Lent to Ana · Due back 1 Mar 2024 · Overdue · Mark returned · Remind Ana",
      "r2 Borrowed from Sam · Mark returned · Remind me",
    ]);
  });
});

import { expect, it } from "vitest";
import { timeLogCopy } from "../../copy";

const entry = (start: string, end: string) => ({ title: "Build", billable: true, start, end });
const input = {
  week: "2026-03-02",
  detail: "full" as const,
  entries: [entry("2026-03-07T23:30:00-05:00", "2026-03-08T03:30:00-04:00")],
};
const data = { project_calendar: [{ timeZone: "America/New_York" }] };

it("splits day totals at local midnight without double counting the DST jump", () => {
  const copy = timeLogCopy(input, "en-GB", data);
  expect(copy.week).toBe("Week of 2 Mar 2026");
  expect(copy.total).toBe("3h");
  expect(copy.days.map(({ date, total, rows }) => [date, total, rows.length])).toEqual([
    ["Sat 7 Mar", "30m", 1],
    ["Sun 8 Mar", "2h 30m", 0],
  ]);
  expect(copy.days[0]?.rows[0]).toMatchObject({ duration: "3h", start: "23:30", end: "03:30" });
  const sunday = timeLogCopy({ ...input, day: "2026-03-08" }, "en-GB", data);
  expect(sunday.total).toBe("3h");
  expect(sunday.days[0]?.total).toBe("2h 30m");
  expect(sunday.days[0]?.rows).toHaveLength(1);
});

it("does not include the day at a midnight end", () => {
  const ending = entry("2026-03-08T23:29:55-04:00", "2026-03-09T00:00:00-04:00");
  const copy = timeLogCopy({ ...input, entries: [ending] });
  expect(copy.days.map(({ day }) => day)).toEqual(["2026-03-08"]);
  expect(copy.total).toBe("30m 5s");
});

import { expect, it } from "vitest";
import { jobFeedCopy } from "../../copy";

const job = {
  workplace: "hybrid",
  pay: { min: 18, max: 22, per: "hour" },
  easyApply: true,
  saved: false,
  posted: "2026-11-20",
} as const;

it("formats the workplace and the brief's pay currency, not a currency stored per job", () => {
  expect(jobFeedCopy(job, "EUR", "en-GB")).toMatchObject({
    workplace: "Hybrid",
    pay: "€18–€22 / hr",
    save: "Save",
    easyApply: "Easy apply",
    apply: "Apply",
  });
  expect(jobFeedCopy({ ...job, pay: { min: 0, max: 0, per: "month" } }, "GBP").pay).toBe("£0 / month");
  expect(jobFeedCopy({ ...job, pay: undefined, easyApply: false, saved: true })).toMatchObject({
    pay: undefined,
    save: "Saved",
    easyApply: undefined,
    apply: undefined,
  });
});

it("uses local calendar days, including today and a date ahead of the local clock", () => {
  const copy = (day: number) => jobFeedCopy(job, undefined, "en-GB", new Date(2026, 10, day, 23, 59)).posted;
  expect(copy(19)).toBe("Posted 20 Nov 2026");
  expect(copy(20)).toBe("Posted today");
  expect(copy(21)).toBe("Posted 1 day ago");
  expect(copy(22)).toBe("Posted 2 days ago");
});

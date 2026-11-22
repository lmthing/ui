import { describe, expect, it } from "vitest";
import { jobAcceptsApplications, jobPostCopy } from "../../copy";

const job = {
  workplace: "hybrid",
  contract: "fixed_term",
  requirements: ["Work samples"],
} as const;

describe("JobPost copy", () => {
  it("formats a range in the app currency and locale, with one pay period", () => {
    const input = { ...job, pay: { min: 1800.5, max: 2400, per: "month" as const } };
    expect(jobPostCopy(input, "EUR", "en-GB").pay).toBe("€1,800.50–€2,400 / month");
    expect(jobPostCopy(input, "EUR", "de-DE").pay).toBe("1.800,50\u00a0€–2.400\u00a0€ / month");
  });

  it("draws an equal range as one amount and leaves absent pay and deadline out", () => {
    expect(jobPostCopy({ ...job, pay: { min: 0, max: 0, per: "hour" } }).pay).toBe("$0 / hr");
    expect(jobPostCopy(job)).toMatchObject({
      workplace: "Hybrid",
      contract: "Fixed-term",
      pay: undefined,
      closes: undefined,
      requirements: ["• Work samples"],
      open: true,
    });
  });

  it("formats the deadline and closes only after the local closing date", () => {
    const input = { ...job, closes: "2027-04-30" };
    const closingDay = new Date(2027, 3, 30, 23, 59, 59, 999);
    const nextDay = new Date(2027, 4, 1);
    expect(jobPostCopy(input, undefined, "en-GB", closingDay).closes).toBe("Apply by 30 Apr 2027");
    expect(jobPostCopy(input, undefined, "en-GB", nextDay).closes).toBe("Applications closed 30 Apr 2027");
    expect(jobAcceptsApplications(input.closes, closingDay)).toBe(true);
    expect(jobAcceptsApplications(input.closes, nextDay)).toBe(false);
    expect(jobAcceptsApplications(undefined, nextDay)).toBe(true);
  });
});

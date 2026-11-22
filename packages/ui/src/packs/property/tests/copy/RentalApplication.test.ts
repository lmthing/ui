import { expect, it } from "vitest";
import { applicationCopy } from "../../copy";

it("adds all applicants' income, divides by rent and uses the requested currency and language", () => {
  const input = {
    unit: "Cedar Flat",
    moveIn: "2027-01-12",
    monthlyRent: 1200,
    applicants: [
      { name: "Noor", monthlyIncome: 1800 },
      { name: "Sam", monthlyIncome: 1000 },
    ],
    decision: "pending",
    checks: [],
  } as const;
  expect(applicationCopy("en-GB", "GBP").summary(input)).toEqual({
    applicants: "Noor and Sam",
    moveIn: "Move-in · 12 Jan 2027",
    householdIncome: "£2,800 monthly household income",
    monthlyRent: "£1,200 monthly rent",
    ratio: "2.33×",
  });
  expect(
    applicationCopy().summary({ ...input, applicants: [{ name: "Noor", monthlyIncome: 0 }] }).ratio,
  ).toBe("0×");
});

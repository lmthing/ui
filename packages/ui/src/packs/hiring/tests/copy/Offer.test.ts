import { describe, expect, it } from "vitest";
import { offerCopy, offerReading, responseCutoff } from "../../copy";

const terms = {
  pay: 20.5,
  per: "hour",
  hoursPerWeek: 19.5,
  start: "2027-05-10",
  respondBy: "2027-05-01",
  conditions: ["Subject to two references"],
  status: "sent",
} as const;

describe("Offer copy", () => {
  it("formats localized pay, hours and dates while leaving authored text intact", () => {
    expect(offerCopy(terms, false, "GBP", "en-GB")).toEqual({
      pay: "£20.50 / hr",
      hours: "19.5 h / week",
      start: "Starts 10 May 2027",
      deadline: "Respond by 1 May 2027",
      conditions: ["• Subject to two references"],
      status: "Sent",
    });
    expect(offerCopy(terms, false, "EUR", "fr-FR").hours).toBe("19,5 h / week");
  });

  it("uses the next local midnight across month and year boundaries", () => {
    expect(responseCutoff("2027-05-01")).toBe(new Date(2027, 4, 2).getTime());
    expect(responseCutoff("2027-12-31")).toBe(new Date(2028, 0, 1).getTime());
    expect(responseCutoff(undefined)).toBeUndefined();
    expect(responseCutoff("2027-02-29")).toBeUndefined();
  });

  it("reads expired offers without active response copy", () => {
    expect(offerReading({ ...terms, expired: true }, "GBP", "en-GB")).toEqual([
      "Expired",
      "£20.50 / hr",
      "19.5 h / week · Starts 10 May 2027",
      "Deadline passed 1 May 2027",
      "Conditions",
      "• Subject to two references",
      "Withdraw offer",
    ]);
  });
  it("reads the grid's separate fields without the inline separator", () => {
    expect(offerReading({ ...terms, expired: false, arrange: "grid" }, "GBP", "en-GB").slice(2, 4)).toEqual([
      "19.5 h / week",
      "Starts 10 May 2027",
    ]);
  });
});

import { expect, it } from "vitest";
import { renewalCopy, renewalExpired, renewalExpiry } from "../../copy";

const offer = {
  unit: "Cedar Flat",
  tenant: "Asha",
  deadline: "2028-12-15",
  status: "sent",
  style: "offer",
  currentRent: 1250,
  proposedRent: 1200,
  selectedOption: 0,
  options: [
    { label: "6 months", months: 6 },
    { label: "12 months", months: 12, rent: 1250 },
  ],
} as const;

it("compares the selected term in the app currency and handles both decreases and no change", () => {
  const copy = renewalCopy("en-GB", "GBP");
  expect(copy.summary(offer)).toEqual({
    proposed: "£1,200",
    current: "Current rent · £1,250",
    change: "-£50 (-4%) from current rent",
    deadline: "Respond by 15 Dec 2028",
  });
  expect(copy.summary({ ...offer, selectedOption: 1 }).change).toBe("No change from current rent");
  expect(copy.option({ label: "Rolling", months: 0, rent: 1300 }, 1200, true)).toEqual({
    title: "Rolling",
    sub: "Rolling term",
    value: "£1,300",
  });
  expect(copy.option({ label: "Fixed", months: 1 }, 1200, false).sub).toBeUndefined();
});

it("admits responses through the end of the deadline day and schedules one wake", () => {
  const end = Date.parse("2028-12-16T00:00:00Z");
  expect(renewalExpired(offer, end - 1)).toBe(false);
  expect(renewalExpired(offer, end)).toBe(true);
  expect(renewalExpiry(offer, end - 1)).toBe(end);
  expect(renewalExpiry(offer, end)).toBeUndefined();
  expect(renewalExpiry({ ...offer, status: "accepted" }, end - 1)).toBeUndefined();
});

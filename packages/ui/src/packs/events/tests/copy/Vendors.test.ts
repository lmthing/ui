import { expect, it } from "vitest";
import { vendorAmounts, vendorCopy, vendorReading } from "../../copy";

const vendor = { role: "photo", name: "Silver Frame", cost: 4.55, paid: 1.24, booked: true } as const;

it("adds cents before subtracting the paid total", () => {
  const rows = [vendor, { cost: 12.3, paid: 12.3 }];
  expect(vendorAmounts(rows, true).map(({ label, value }) => [label, value])).toEqual([
    ["Left to pay", "$3.31"],
    ["Total agreed", "$16.85"],
    ["Total paid", "$13.54"],
  ]);
  expect(
    vendorAmounts(
      [
        { cost: 0.3, paid: 0.1 },
        { cost: 0, paid: 0 },
      ],
      false,
    )[2].value,
  ).toBe("$0.20");
});

it("localizes money and date formatting without changing stored values", () => {
  const row = { ...vendor, due: "2027-05-30" };
  expect(vendorCopy(row, "full", "en-GB").due).toBe("Due 30 May 2027");
  expect(vendorAmounts([row], false, "de-DE")[0].value).toBe("4,55\u00a0$");
  expect(vendorCopy(row, "brief", "en-GB").due).toBeUndefined();
  expect(row.due).toBe("2027-05-30");
});

it("reads booking status, balance and call together while excluding a hidden date and the dial number", () => {
  const row = { ...vendor, booked: false, phone: "01632 960123", due: "2027-05-30" };
  expect(vendorReading([row], "brief").at(-1)).toBe(
    "r1: Photography · Not booked · Agreed: $4.55 · Paid: $1.24 · Left: $3.31 · Call Silver Frame",
  );
});

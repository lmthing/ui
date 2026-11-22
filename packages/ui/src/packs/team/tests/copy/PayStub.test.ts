import { expect, it } from "vitest";
import { payStubDisplay, payStubTotals } from "../../copy";

const data = {
  employee: "Rae",
  periodFrom: "2026-11-01",
  periodTo: "2026-11-14",
  payDate: "2026-11-20",
  earnings: [
    { label: "Hours", amount: 8, rate: 0, hours: 0 },
    { label: "Other", amount: 2 },
  ],
  deductions: [{ label: "Tax", amount: 12 }],
  ytdNet: 0,
};

it("totals issued lines and allows negative net as well as zero deductions", () => {
  expect(payStubTotals(data)).toEqual({ gross: 10, deducted: 12, net: -2 });
  expect(payStubTotals({ ...data, deductions: [] })).toEqual({ gross: 10, deducted: 0, net: 10 });
});

it("formats money and optional zero amounts in the app currency and locale", () => {
  const display = payStubDisplay(data, "de-DE", "EUR");
  expect(display.net).toBe("-2,00\u00a0€");
  expect(display.earnings[0]?.note).toBe("0 h · 0,00\u00a0€/h");
  expect(display.ytd[0]?.amount).toBe("0,00\u00a0€");
  expect(display.paid).toBe("Paid 20. Nov. 2026");
});

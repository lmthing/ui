import { expect, it } from "vitest";
import { dividendCopy, dividendReading } from "../../copy";

const row = {
  id: "r1",
  assetId: "item_1",
  entitledAt: "2026-03-01T23:30:00-02:00",
  payOn: "2026-03-03",
  perUnit: 2,
  withheld: 1,
  entitledUnits: 4,
  gross: 8,
  net: 7,
};

it("formats app-currency cash and UTC entitlement dates without inventing missing totals", () => {
  expect(dividendCopy(row, "en-GB", "GBP")).toMatchObject({
    asset: "Item one",
    status: "Expected",
    entitled_at: "Entitled 2 Mar 2026",
    pay_on: "Pay date 3 Mar 2026",
    per_unit: "£2 per unit",
    gross: "Gross £8",
    net: "£7",
  });
  expect(dividendCopy({ ...row, net: null }).net).toBe("Unknown");
});

it("keeps receipt status and net cash in the brief read but hides the breakdown", () => {
  const distributions = [{ ...row, receivedAt: "2026-03-03T09:00:00Z", void: true }];
  const read = dividendReading({ distributions, detail: "brief", receiptRecorded: true }).join(" ");
  expect(read).toContain("Receipt recorded");
  expect(read).toContain("Received");
  expect(read).toContain("Net cash · $7");
  expect(read).toContain("Reverse receipt");
  expect(read).not.toContain("Withheld");
});

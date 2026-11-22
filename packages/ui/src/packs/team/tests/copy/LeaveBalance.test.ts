import { expect, it } from "vitest";
import { leaveBalanceFigures } from "../../copy";

it("subtracts used and pending leave, and shows the fraction of accrued leave still available", () => {
  const row = { label: "PTO", accrued: 8, used: 3, pending: 2, cap: 4 };
  expect(leaveBalanceFigures(row, "hours")).toMatchObject({ available: "3 h", cap: "4 h", ratio: 3 / 8 });
  expect(leaveBalanceFigures({ ...row, accrued: 0 }, "hours")).toMatchObject({ available: "-5 h", ratio: 0 });
  expect(leaveBalanceFigures({ ...row, cap: 16 }, "hours").ratio).toBe(3 / 8);
});

it("formats fractional amounts and expiration with the requested locale", () => {
  const row = { label: "PTO", accrued: 2.5, used: 0, pending: 0, expiresOn: "2026-12-31" };
  expect(leaveBalanceFigures(row, "days", "de-DE")).toMatchObject({
    available: "2,5 d",
    expires: "Expires 31.12.2026",
  });
});

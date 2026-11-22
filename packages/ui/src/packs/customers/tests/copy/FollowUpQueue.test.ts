import { expect, it } from "vitest";
import { followUpDetails, followUpPriority, followUpToday, orderFollowUps } from "../../copy";

const row = { due: "2026-11-21", done: false, kind: "invoice" } as const;

it("compares calendar dates using the local day and never marks completed work overdue", () => {
  const today = followUpToday(new Date(2026, 10, 21, 23, 30));
  expect(today).toBe("2026-11-21");
  expect(followUpPriority({ ...row, due: "2026-11-20" }, today)).toBe("overdue");
  expect(followUpPriority(row, today)).toBe("today");
  expect(followUpPriority({ ...row, due: "2026-11-22" }, today)).toBe("upcoming");
  expect(followUpPriority({ ...row, due: "2026-11-20", done: true }, today)).toBe("done");
});

it("retains stable row identity and seed order for ties without mutating input", () => {
  const sameDay = { ...row, id: "same_day" };
  const later = { ...row, id: "later", due: "2026-11-22" };
  const done = { ...row, id: "done", due: "2026-11-20", done: true };
  const original = [later, row, done, sameDay] as const;
  expect(orderFollowUps(original)).toEqual([row, sameDay, later, done]);
  expect(original[0]).toBe(later);
});

it("shares localized dates and amounts, distinguishing no amount from zero", () => {
  expect(followUpDetails(row, row.due, "en-GB", "GBP")).toMatchObject({
    kind: "Invoice",
    date: "21 Nov 2026",
    badge: "Due today",
    amount: undefined,
  });
  expect(followUpDetails({ ...row, amount: 0 }, row.due, "en-GB", "GBP").amount).toBe("£0");
});

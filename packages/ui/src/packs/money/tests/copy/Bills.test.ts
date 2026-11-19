import { describe, expect, it } from "vitest";
import { billLines, billTotalLine, localBillDate, orderedBills } from "../../copy";
import { moneyWordsFor, registerMoneyWords } from "../../lang";

const today = "2026-11-19";
const base = { name: "Power", amount: 10, due: today, repeat: "never", paid: false } as const;

describe("Bills copy", () => {
  it("sorts by due date or descending cost without renumbering or mutating rows", () => {
    const undated = { ...base, id: "r1", due: undefined, amount: 20 };
    const later = { ...base, id: "r2", amount: 10, due: "2026-12-01" };
    const sooner = { ...base, id: "r3", amount: 5 };
    const bills = [undated, later, sooner];
    expect(orderedBills(bills, "due")).toEqual([sooner, later, undated]);
    expect(orderedBills(bills, "subscriptions")).toEqual(bills);
    expect(bills[0]).toBe(undated);
  });

  it("uses a local calendar date and flags only past unpaid bills", () => {
    const past = { ...base, due: "2026-11-18" };
    expect(localBillDate(new Date(2026, 10, 19, 0, 1))).toBe(today);
    expect(billLines(past, today)).toEqual({
      amount: "$10",
      due: "18 Nov 2026",
      shortDue: "18 Nov",
      repeat: undefined,
      overdue: true,
    });
    expect(billLines({ ...past, paid: true }, today).overdue).toBe(false);
    expect(billLines(base, today).overdue).toBe(false);
    expect(billLines({ ...base, due: "2027-01-01" }, today).shortDue).toBe("1 Jan 2027");
    expect(billLines({ ...base, due: undefined }, today)).toMatchObject({ due: undefined, overdue: false });
  });

  it("projects recurring costs and excludes one-offs from the yearly subscription total", () => {
    const bills = [
      { ...base, amount: 12, repeat: "weekly" },
      { ...base, amount: 10, repeat: "monthly", paid: true },
      { ...base, amount: 72, repeat: "yearly" },
      base,
      { ...base, amount: 40, due: "2026-12-01" },
      { ...base, amount: 2.75, due: undefined },
    ] as const;
    expect(billTotalLine({ bills, style: "due" }, today)).toEqual({
      label: "Monthly estimate",
      amount: "$80.75",
    });
    expect(billTotalLine({ bills, style: "subscriptions" }, today)).toEqual({
      label: "Yearly total",
      amount: "$816",
    });
  });
});

describe("Bills localization", () => {
  it("passes the locale to money, dates and the pack's words", () => {
    const defaults = moneyWordsFor();
    const unregister = registerMoneyWords("de", {
      ...defaults,
      bills: { ...defaults.bills, repeat: { ...defaults.bills.repeat, monthly: "Monatlich" } },
    });
    try {
      const line = billLines({ ...base, amount: 1234.5, repeat: "monthly" }, today, "de-DE");
      expect(line.due).toBe("19. Nov. 2026");
      expect(line.repeat).toBe("Monatlich");
      expect(line.amount).toBe("1.234,50\u00a0$");
    } finally {
      unregister();
    }
  });
});

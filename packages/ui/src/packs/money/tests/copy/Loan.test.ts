import { describe, expect, it } from "vitest";
import { loanCopy, loanToday, projectLoan } from "../../copy";

const terms = { principal: 100, rate: 12, payment: 40, firstDue: "2028-01-31", payments: [] };
const today = "2028-01-31";

describe("repayment projection", () => {
  it("rounds each instalment's interest, caps the last payment and preserves the due day", () => {
    expect(projectLoan(terms, today)).toEqual({
      balance: 100,
      status: "active",
      finish: "2028-03-31",
      rows: [
        { due: "2028-01-31", principal: 39, interest: 1, balance: 61 },
        { due: "2028-02-29", principal: 39.39, interest: 0.61, balance: 21.61 },
        { due: "2028-03-31", principal: 21.61, interest: 0.22, balance: 0 },
      ],
    });
  });

  it("accrues elapsed periods, applies due records (including today), and ignores future records", () => {
    const payments = [
      { due: "2028-02-29", amount: 10 },
      { due: "2028-03-31", amount: 999 },
      { due: "2028-02-29", amount: 15 },
    ];
    const result = projectLoan({ ...terms, payments }, "2028-02-29");
    expect(result.balance).toBe(77.01);
    expect(result.rows[0]).toEqual({ due: "2028-03-31", principal: 39.23, interest: 0.77, balance: 37.78 });
  });

  it("clears an interest-free overpayment without a negative balance or a forecast", () => {
    const payments = [{ due: terms.firstDue, amount: 120 }];
    expect(projectLoan({ ...terms, rate: 0, payments }, today)).toEqual({
      balance: 0,
      rows: [],
      status: "cleared",
    });
  });

  it.each([0.99, 1])("cannot clear when %s does not exceed interest", (payment) => {
    expect(projectLoan({ ...terms, payment }, today)).toEqual({
      balance: 100,
      rows: [],
      status: "insufficient",
    });
  });

  it("uses the currency's minor units when computing interest", () => {
    expect(projectLoan({ ...terms, principal: 155 }, today, "JPY").rows[0]).toMatchObject({
      interest: 2,
      principal: 38,
      balance: 117,
    });
    expect(projectLoan({ ...terms, principal: 155 }, today, "EUR").rows[0]).toMatchObject({
      interest: 1.55,
      principal: 38.45,
      balance: 116.55,
    });
  });
});

describe("repayment boundaries", () => {
  it("ends an unfinished forecast at 600 instalments, never inventing a payoff date", () => {
    const slow = { ...terms, rate: 0, principal: 601, payment: 1 };
    expect(projectLoan(slow, today)).toMatchObject({ balance: 601, status: "active" });
    expect(projectLoan(slow, today).rows).toHaveLength(600);
    expect(projectLoan(slow, today)).not.toHaveProperty("finish");
    expect(projectLoan({ ...slow, principal: 600 }, today)).toHaveProperty("finish", "2077-12-31");
  });

  it("cannot fabricate a date or non-finite balance at numeric or calendar limits", () => {
    expect(projectLoan({ ...terms, principal: Number.MAX_VALUE }, today)).toEqual({
      rows: [],
      status: "outOfRange",
    });
    expect(projectLoan({ ...terms, firstDue: "9999-12-31" }, today).rows).toHaveLength(1);
    expect(projectLoan({ ...terms, firstDue: "9999-12-31" }, today)).not.toHaveProperty("finish");
    expect(loanToday(new Date(2028, 1, 9, 23))).toBe("2028-02-09");
  });
});

describe("Loan copy", () => {
  it("keeps six rows, adds a localized count, and uses one forecast for both styles", () => {
    const slow = { ...terms, rate: 0, principal: 701, payment: 100 };
    const schedule = loanCopy({ ...slow, detail: "full" }, "filled", "en-GB", today, "GBP");
    const summary = loanCopy({ ...slow, detail: "brief" }, "filled", "en-GB", today, "GBP");
    expect(schedule.schedule).toHaveLength(6);
    expect(schedule.schedule[0]?.remaining).toBe("£601.00 left");
    expect(schedule.more).toBe("And 2 more payments");
    expect(summary.schedule).toEqual([]);
    expect(summary.more).toBeUndefined();
    expect(summary.next).toEqual(schedule.next);
    expect(summary.next?.headline).toBe("Next payment · 31 Jan 2028 · £100");
    expect(summary.finish).toBe(schedule.finish);
    expect(loanCopy({ ...slow, principal: 700, detail: "full" }, "filled", "en", today).more).toBe(
      "And 1 more payment",
    );
  });
});

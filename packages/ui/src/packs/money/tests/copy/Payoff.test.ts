import { describe, expect, it } from "vitest";
import { payoffCopy, payoffReading, payoffSelection, projectPayoff } from "../../copy";
import { moneyWordsFor, registerMoneyWords } from "../../lang";

const debt = { principal: 100, rate: 0, payment: 20, firstDue: "2026-12-01", payments: [] };
const input = { debts: [debt], extra: 0, strategy: "high_rate" as const };

describe("Payoff projection", () => {
  it("calculates each month and reallocates a closed debt's payment", () => {
    const plan = projectPayoff({ ...input, debts: [debt, { ...debt, principal: 30 }] });
    expect(plan).toMatchObject({ total: 130, budget: 40, points: [130, 90, 50, 10, 0] });
    expect(plan.accounts.map(({ clearance }) => clearance)).toEqual([plan.asOf + 4, plan.asOf + 2]);
  });
  it("prioritizes either the highest rate or the smallest outstanding debt", () => {
    const setup = {
      ...input,
      extra: 50,
      debts: [
        { ...debt, rate: 12 },
        { ...debt, principal: 40 },
      ],
    };
    const rate = projectPayoff(setup);
    const small = projectPayoff({ ...setup, strategy: "small_balance" });
    expect(rate.accounts.map(({ index, clearance }) => [index, clearance])).toEqual([
      [0, rate.asOf + 2],
      [1, rate.asOf + 2],
    ]);
    expect(small.accounts.map(({ index, clearance }) => [index, clearance])).toEqual([
      [1, small.asOf + 1],
      [0, small.asOf + 2],
    ]);
  });
  it("replays dated records chronologically and does not start later payments early", () => {
    const plan = projectPayoff({
      ...input,
      debts: [
        {
          ...debt,
          rate: 12,
          payments: [
            { due: "2027-01-01", amount: 20 },
            { due: "2026-12-20", amount: 20 },
          ],
        },
        { ...debt, firstDue: "2027-03-01" },
      ],
    });
    expect(plan.accounts.map(({ opening }) => opening)).toEqual([61.81, 100]);
    expect(plan.points.slice(0, 3)).toEqual([161.81, 142.43, 102.85]);
  });
  it("recognizes debts already cleared and budgets that cannot reduce debt", () => {
    const paid = projectPayoff({
      ...input,
      debts: [{ ...debt, payments: [{ due: debt.firstDue, amount: 100 }] }],
    });
    expect(paid).toMatchObject({ cleared: true, total: 0, points: [0], finish: paid.asOf });
    const stuck = { ...input, debts: [{ ...debt, rate: 12, payment: 1 }] };
    expect(projectPayoff(stuck)).toMatchObject({ cleared: false, finish: undefined, points: [100, 100] });
    expect(projectPayoff({ ...stuck, extra: 25 }).finish).toBeDefined();
  });
});

describe("Payoff copy", () => {
  it("keeps the extreme inputs and chart samples finite and bounded", () => {
    const value = Number.MAX_VALUE;
    const huge = {
      ...input,
      debts: [
        { ...debt, principal: value, rate: 100 },
        { ...debt, principal: value },
      ],
    };
    const plan = projectPayoff(huge);
    expect(plan.total).toBe(value);
    expect(plan.points.every(Number.isFinite)).toBe(true);
    expect(payoffCopy(huge).series[0]!.points.length).toBeLessThanOrEqual(61);
    expect(payoffCopy(huge).series[0]!.points.every(({ value }) => Number.isFinite(value))).toBe(true);
  });
  it("shares localized amounts and dates with the reader and omits plot copy in compact", () => {
    const copy = payoffCopy(input, "fr-FR");
    expect(copy.total).toBe("100\u00a0$US");
    expect(copy.finish).toContain("avr.");
    const compact = payoffReading({ ...input, style: "compact" }, "fr-FR");
    expect(compact).toContain(copy.finish);
    expect(compact).not.toContain(copy.series[0]!.label);
  });
  it("reads translated strategy choices without changing the values accepted by the controls", () => {
    const en = moneyWordsFor();
    const choice = { high_rate: "Taux élevé", small_balance: "Petit solde" };
    const unregister = registerMoneyWords("fr", { ...en, payoff: { ...en.payoff, choice } });
    try {
      const reading = payoffReading({ ...input, style: "compact" }, "fr");
      expect(reading).toEqual(expect.arrayContaining(Object.values(choice)));
      expect(reading).not.toContain(en.payoff.choice.small_balance);
      expect(payoffSelection("high_rate", en.payoff.choice.small_balance).strategy).toBe("small_balance");
    } finally {
      unregister();
    }
  });
});

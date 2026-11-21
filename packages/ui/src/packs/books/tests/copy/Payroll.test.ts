import { describe, expect, it } from "vitest";
import { components, type DeviceData } from "@lmthing/ui/catalog";
import { payrollDisplay, validGross } from "../../copy";

const { props, examples } = components.Payroll;
const draft = props.parse(examples[0]!);
const hourly = draft.payees[0]!;
const rules: DeviceData = {
  books_payroll_rules: [
    { currency: "GBP", rates: { sample_pay: { deductionRate: 0.15, employerRate: 0.1 } } },
  ],
};

describe("Payroll calculation and copy", () => {
  it("extends hourly pay, applies signed adjustments and rounds each rule amount before totaling", () => {
    const row = {
      ...hourly,
      rate: 10.005,
      hours: 3,
      adjustments: [{ label: "Correction", amount: -0.005 }],
    };
    const display = payrollDisplay({ ...draft, payees: [row] }, rules);
    expect(display.totals.map(({ value }) => value)).toEqual(["£25.51", "£30.01", "£4.50", "£33.01"]);
    expect(display.rows[0]?.adjustments).toEqual(["Correction: -£0.01"]);
  });

  it("uses the period salary plus adjustments, never salary times hours", () => {
    const paid = props.parse(examples[1]!);
    const result = payrollDisplay(
      {
        ...paid,
        payees: [
          {
            ...paid.payees[0]!,
            frozen: {
              ruleRef: "sample_pay",
              currency: "GBP",
              figures: { gross: 89500, deductions: 13425, net_pay: 76075, employer_cost: 98450 },
            },
          },
        ],
      },
      rules,
    );
    expect(result.totals.map(({ value }) => value)).toEqual(["£760.75", "£895", "£134.25", "£984.50"]);
    expect(result.rows[0]?.paid).toBe("Payment recorded: 1 Dec 2026");
  });

  it("accepts floating-point zero, not genuinely negative gross", () => {
    const zero = { ...hourly, rate: 0.3, hours: 3, adjustments: [{ label: "Correction", amount: -0.9 }] };
    expect(validGross(zero)).toBe(true);
    expect(validGross({ ...zero, rate: 0.29 })).toBe(false);
    expect(payrollDisplay({ ...draft, payees: [zero] }, rules).totals.map(({ value }) => value)).toEqual(
      Array(4).fill("£0"),
    );
  });
});

describe("Payroll host rules and language", () => {
  it.each([
    undefined,
    { books_payroll_rules: [{ currency: "GBP", rates: {} }] },
    {
      books_payroll_rules: [
        { currency: "GBP", rates: { sample_pay: { deductionRate: 1.1, employerRate: 0 } } },
      ],
    },
  ])("does not fabricate figures for absent or invalid host rules", (data) => {
    const display = payrollDisplay(draft, data);
    expect(display.notice).toBe("Pay figures unavailable. Check the payroll rules.");
    expect(display.totals.map(({ value }) => value)).toEqual(Array(4).fill("—"));
  });

  it("uses the rule version referenced by the seed, not a newer version", () => {
    const data: DeviceData = {
      books_payroll_rules: [
        {
          currency: "GBP",
          rates: {
            sample_pay: { deductionRate: 0.15, employerRate: 0.1 },
            sample_pay_v2: { deductionRate: 0.5, employerRate: 0.2 },
          },
        },
      ],
    };
    const finalizedAt = "2026-12-01T09:00:00Z";
    const frozen = {
      ...draft,
      finalizedAt,
      payees: [
        {
          ...hourly,
          rate: 99,
          frozen: {
            ruleRef: "sample_pay",
            currency: "GBP" as const,
            figures: { gross: 12000, deductions: 1800, net_pay: 10200, employer_cost: 13200 },
          },
        },
      ],
    };
    const result = payrollDisplay(frozen, data);
    expect(result.totals.map(({ value }) => value)).toEqual(["£102", "£120", "£18", "£132"]);
    expect(result.totals).toEqual(payrollDisplay(frozen, rules).totals);
    expect(payrollDisplay({ ...draft, finalizedAt }, rules).totals.map(({ value }) => value)).toEqual(
      Array(4).fill("—"),
    );
  });

  it("passes the language to money, number and date formatting", () => {
    const display = payrollDisplay({ ...draft, payees: [{ ...hourly, hours: 10.5 }] }, rules, "de-DE");
    expect(display.rows[0]?.detail?.hours).toBe("10,5 h");
    expect(display.rows[0]?.figures[0]?.value).toContain("107,10");
    expect(display.from).toMatch(/^1\./);
  });
});

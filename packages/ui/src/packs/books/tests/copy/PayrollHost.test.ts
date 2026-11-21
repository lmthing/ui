import { components, type DeviceData } from "@lmthing/ui/catalog";
import { describe, expect, it } from "vitest";
import { canFinalizePayroll, canVoidPayroll, payrollRows, previewPayroll, validFrozenRun } from "../../copy";

const { props, examples } = components.Payroll;
const draft = props.parse(examples[0]!);
const slip = props.parse(examples[1]!);
const host = previewPayroll({ input: slip, state: "filled" });
const record = host.books_payroll_runs![0] as {
  payees: { frozen: { ruleRef: string; currency: string; figures: Record<string, number> } }[];
};
const patch = (extra: object): DeviceData => ({ ...host, books_payroll_runs: [{ ...record, ...extra }] });

describe("Payroll host projection", () => {
  it("requires the one matching run, its canonical payees and a balanced frozen result", () => {
    expect(validFrozenRun(host, slip)).toBe(true);
    expect(validFrozenRun(host, { ...slip, from: "2026-11-02" })).toBe(false);
    expect(validFrozenRun({ ...host, books_payroll_runs: [record, record] }, slip)).toBe(false);
    const row = record.payees[0]!;
    expect(validFrozenRun(patch({ payees: [{ ...row, frozen: undefined }] }), slip)).toBe(false);
    for (const mismatch of [{ runRef: "other_run" }, { employeeRef: "other_employee" }])
      expect(
        validFrozenRun(patch({ payees: [{ ...row, frozen: { ...row.frozen, ...mismatch } }] }), slip),
      ).toBe(false);
    expect(
      validFrozenRun(patch({ payees: [{ ...row, frozen: { ...row.frozen, ruleRef: "other" } }] }), slip),
    ).toBe(false);
    expect(
      validFrozenRun(
        patch({
          payees: [{ ...row, frozen: { ...row.frozen, figures: { ...row.frozen.figures, net_pay: 1 } } }],
        }),
        slip,
      ),
    ).toBe(false);
    expect(canVoidPayroll(host, { ...slip, style: "run" })).toBe(false);
  });

  it("preserves projected order while the host selects a payee independently of the seed", () => {
    const input = { ...draft, style: "payslip" };
    const data = previewPayroll({ input, state: "filled" });
    expect(
      payrollRows(data, input).map(({ employeeRef, activePayee, visible }) => [
        employeeRef,
        activePayee,
        visible,
      ]),
    ).toEqual([
      ["jo", false, false],
      ["mira", true, true],
    ]);
    expect(canFinalizePayroll(data, { ...input, style: "run" })).toBe(true);
    expect(canFinalizePayroll({}, input)).toBe(false);
    expect(validFrozenRun({ ...data, books_payroll_rules: [] }, input)).toBe(false);
  });
});

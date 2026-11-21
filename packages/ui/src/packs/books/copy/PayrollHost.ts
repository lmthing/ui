import { z } from "zod";
import * as c from "../../../catalog";
import { dateTime, distinct, periodFields, ref } from "../seeds";
import { calculatePayroll, frozenPayroll, payrollConfig, payrollScale, validGross } from "./Payroll";

const recordRef = ref.meta({ kind: "ref" });
// prettier-ignore
export const payrollPayee = z.strictObject({
  employeeRef: recordRef, name: c.text(24), basis: z.enum(["hourly", "salary"]), rate: z.number().nonnegative(),
  hours: z.number().min(0).max(744).optional(), ruleRef: recordRef, paidAt: dateTime.optional(),
  adjustments: z.array(z.strictObject({ label: c.text(20), amount: z.number() })).min(0).max(3),
}).refine(({ basis, hours }) => (basis === "hourly") === (hours !== undefined), { path: ["hours"] })
  .refine(validGross, { path: ["adjustments"], message: "Gross pay must be nonnegative and finite" });

const minor = z.int().nonnegative();
const frozenFigures = z.object({ gross: minor, deductions: minor, net_pay: minor, employer_cost: minor });
// prettier-ignore
const frozenPayee = z.object({
  runRef: recordRef, employeeRef: recordRef, ruleRef: recordRef, currency: c.appCurrencySchema, figures: frozenFigures,
});
const hostPayee = payrollPayee.safeExtend({ frozen: frozenPayee.optional() });
const hostRun = z.object({
  runRef: recordRef,
  ...periodFields,
  payDate: c.isoDate,
  activeEmployee: recordRef.optional(),
  finalizedAt: dateTime.optional(),
  voided: z.boolean().default(false),
  payees: z.array(hostPayee).min(1).max(6),
});
export const payrollRow = hostPayee.safeExtend({
  activePayee: z.boolean(),
  visible: z.boolean(),
  canRecord: z.boolean(),
  canSend: z.boolean(),
});
export type PayrollRow = z.output<typeof payrollRow> & { id: string };
type HostRun = z.output<typeof hostRun>;
type Identity = Pick<HostRun, "runRef" | "from" | "to" | "payDate">;
type Input = Identity & { style: "run" | "payslip" };

function source(data: c.DeviceData, props: c.Values) {
  const found = (data.books_payroll_runs ?? []).filter((raw) => {
    const run = raw as Identity | null;
    return (
      run?.runRef === props.runRef &&
      run?.from === props.from &&
      run?.to === props.to &&
      run?.payDate === props.payDate
    );
  });
  if (found.length !== 1) return;
  const run = hostRun.safeParse(found[0]).data;
  if (!run || !distinct(run.payees, ({ employeeRef }) => employeeRef)) return;
  if (
    run.payees.some(
      ({ paidAt }) =>
        paidAt && (run.voided || !run.finalizedAt || Date.parse(paidAt) < Date.parse(run.finalizedAt)),
    )
  )
    return;
  return run;
}

function calculationsMatch(run: HostRun, data: c.DeviceData) {
  const config = payrollConfig(data);
  if (!config) return false;
  const numbers = run.payees.map((payee) => {
    if (!Object.hasOwn(config.rates, payee.ruleRef)) return;
    if (!run.finalizedAt) return calculatePayroll(payee, config, payrollScale(config.currency));
    if (payee.frozen?.runRef !== run.runRef || payee.frozen.employeeRef !== payee.employeeRef) return;
    return frozenPayroll(payee, config);
  });
  if (!numbers.every((figures) => figures !== undefined)) return false;
  const parts = Object.keys(frozenFigures.shape) as (keyof typeof frozenFigures.shape)[];
  return parts.every((part) => Number.isSafeInteger(numbers.reduce((sum, row) => sum + row[part], 0)));
}

export function payrollRows(data: c.DeviceData, props: c.Values) {
  const run = source(data, props);
  if (!run) return [];
  const activeFinal = Boolean(run.finalizedAt && !run.voided);
  return run.payees.map((payee) => {
    const activePayee = run.activeEmployee === payee.employeeRef;
    return {
      ...payee,
      frozen:
        payee.frozen?.runRef === run.runRef && payee.frozen.employeeRef === payee.employeeRef
          ? payee.frozen
          : undefined,
      activePayee,
      visible: props.style === "run" || activePayee,
      canRecord: activeFinal && !payee.paidAt,
      canSend: activeFinal,
    };
  });
}

export function validFrozenRun(data: c.DeviceData, props: c.Values) {
  const run = source(data, props);
  return Boolean(run && !run.voided && calculationsMatch(run, data));
}

export function canFinalizePayroll(data: c.DeviceData, props: c.Values) {
  const run = source(data, props);
  return Boolean(run && !run.voided && !run.finalizedAt && props.style === "run");
}

export function canVoidPayroll(data: c.DeviceData, props: c.Values) {
  const run = source(data, props);
  return Boolean(run && !run.voided && run.payees.every(({ paidAt }) => !paidAt) && props.style === "run");
}

export function payrollLifecycle(input: c.Values, data: c.DeviceData) {
  const run = source(data, input);
  return { finalizedAt: run?.finalizedAt, voided: run?.voided ?? false };
}

// Synthetic only: the gallery adapter supplies it, not the catalog's reader or renderer.
// prettier-ignore
export function previewPayroll({ input, state }: { input: c.Values; state: c.StateName }): c.DeviceData {
  const { runRef, from, to, payDate, payees, voided, finalizedAt, style } = input as Input & HostRun;
  const config = { currency: "GBP", rates: { sample_pay: { deductionRate: 0.15, employerRate: 0.1 } } } as const;
  const finalized = finalizedAt ?? (state === "success" ? `${payDate}T09:00:00Z` : undefined);
  return {
    books_payroll_rules: [config],
    books_payroll_runs: [{ runRef, from, to, payDate, voided, finalizedAt: finalized,
      activeEmployee: style === "payslip" ? (runRef === "nov_care" ? "mira" : "sam") : undefined,
      payees: payees.map((payee) => ({ ...payee, frozen: finalized ?
        { runRef, employeeRef: payee.employeeRef, ruleRef: payee.ruleRef, currency: config.currency,
          figures: calculatePayroll(payee, config, payrollScale(config.currency)) } : undefined })),
    }],
  };
}

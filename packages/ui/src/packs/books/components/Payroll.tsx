import { z } from "zod";
import * as c from "../../../catalog";
import { dateTime, distinct, periodFields, ref, seedPeriod, seedTitle, validPeriod } from "../seeds";

// Core first: People/rows cannot calculate or freeze pay runs, record net payments or send payslips.
export const meta = {
  id: "Payroll",
  status: "draft",
  group: "data",
  purpose: "Calculate, finalise and retain a small business's pay run.",
  pick: "A business pay run with hourly or salary inputs, adjustments, deductions and employer costs; finalise it or open payslips. Not a people directory (People), a staff time record (Timesheet), clock-in (TimeClock), or project time (TimeLog).",
  writeHints: [
    "Use unique snake_case employeeRefs and one to six payees. Hourly payees require hours (0–744); omit hours for salary and use the period salary as rate.",
    "Do not write computed gross, deductions, net pay or employer costs. A paidAt requires a finalizedAt, with offset datetimes, and a run with a recorded payment cannot be voided.",
    'Use style "payslip" for the breakdown of the payee selected by the host; otherwise use "run".',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "Payroll uses local pay records and rules; sending payslips needs messaging, not a bank.",
  variants: { density: ["comfortable", "compact"] },
  parts: [
    "root",
    "from",
    "to",
    "pay_date",
    "gross",
    "deductions",
    "net_pay",
    "employer_cost",
    "finalize",
    "void",
  ],
  items: {
    key: "payees",
    parts: [
      "root",
      "name",
      "basis",
      "rate",
      "hours",
      "adjustments",
      "gross",
      "deductions",
      "net_pay",
      "employer_cost",
      "record",
      "send",
    ],
  },
  partTiers: { send: "service" },
  confirmParts: ["finalize", "void"],
  states: ["filled", "empty", "loading", "success", "error"],
  actions: {
    parts: { finalize: ["press"], void: ["press"] },
    items: { root: ["press"], record: ["press"], send: ["press"] },
    when: {
      root: { style: "run" },
      finalize: { canFinalize: true },
      void: { canVoid: true },
      record: { canRecord: true },
      send: { activeFinal: true },
    },
  },
  readSuccess: true,
  successActions: ["root.press", "record.press", "send.press", "void.press"],
  read: (input, _state, lang): string[] =>
    (input as z.output<typeof props>).payees.map(
      ({ name, basis, rate, hours }, index) =>
        `r${index + 1}: ${name} · ${basis} · ${c.numberLine(rate, lang)}${hours === undefined ? "" : ` · ${c.numberLine(hours, lang)} h`}`,
    ),
} as const satisfies c.Meta;

const payee = z
  .strictObject({
    employeeRef: ref,
    name: c.text(24),
    basis: z.enum(["hourly", "salary"]),
    rate: z.number().nonnegative(),
    hours: z.number().min(0).max(744).optional(),
    adjustments: z
      .array(z.strictObject({ label: c.text(20), amount: z.number() }))
      .min(0)
      .max(3),
    ruleRef: ref,
    paidAt: dateTime.optional(),
  })
  .refine(({ basis, hours }) => (basis === "hourly") === (hours !== undefined), { path: ["hours"] })
  .refine(
    ({ rate, hours, adjustments }) => {
      const gross = rate * (hours ?? 1) + adjustments.reduce((sum, { amount }) => sum + amount, 0);
      return Number.isFinite(gross) && gross >= 0;
    },
    { path: ["adjustments"], message: "Adjustments cannot make gross pay negative" },
  );

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    runRef: ref,
    ...periodFields,
    payDate: c.isoDate,
    payees: z.array(payee).min(1).max(6),
    finalizedAt: dateTime.optional(),
    voided: z.boolean().default(false),
    style: z.enum(["run", "payslip"]).default("run"),
  })
  .refine(validPeriod, { path: ["to"], message: "Use an ordered period of at most 366 days" })
  .refine(
    ({ payees, finalizedAt, voided }) =>
      distinct(payees, ({ employeeRef }) => employeeRef) &&
      payees.every(
        ({ paidAt }) =>
          paidAt === undefined ||
          (!voided && finalizedAt !== undefined && Date.parse(paidAt) >= Date.parse(finalizedAt)),
      ),
    { path: ["payees"], message: "Payees must be unique; payments require an active finalized run" },
  )
  .overwrite((input) => {
    const activeFinal = input.finalizedAt !== undefined && !input.voided;
    return {
      ...input,
      activeFinal,
      canFinalize: input.finalizedAt === undefined && !input.voided,
      canVoid: !input.voided && input.payees.every(({ paidAt }) => paidAt === undefined),
      payees: input.payees.map((row) => ({ ...row, canRecord: activeFinal && row.paidAt === undefined })),
    };
  });

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return {
    runRef: "item_1",
    ...seedPeriod,
    payDate: seedPeriod.to,
    payees: [
      {
        employeeRef: "item_2",
        name: seedTitle(input, 24),
        basis: "salary",
        rate: 0,
        adjustments: [],
        ruleRef: "item_3",
      },
    ],
  };
}

// prettier-ignore
export const examples = [
  { runRef: "nov_care", from: "2026-11-01", to: "2026-11-30", payDate: "2026-12-01", payees: [
    { employeeRef: "jo", name: "Jo Lin", basis: "hourly", rate: 12, hours: 10,
      adjustments: [], ruleRef: "sample_pay" },
  ] },
  { runRef: "nov_walks", from: "2026-11-01", to: "2026-11-30", payDate: "2026-12-01", style: "payslip",
    density: "compact", finalizedAt: "2026-12-01T09:00:00Z", voided: false, payees: [
      { employeeRef: "sam", name: "Sam Moss", basis: "salary", rate: 850,
        adjustments: [{ label: "Weekend cover", amount: 45 }], ruleRef: "sample_pay", paidAt: "2026-12-01T12:00:00Z" },
    ] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Payroll");
export const probes = [
  choose(
    "Calculate my staff's pay from hours or salary, with deductions and employer costs, then let me finalise the run and issue payslips.",
  ),
  choose(
    "List the names and faces of the people on my team as a directory and let me open a person.",
    "People",
  ),
  write(
    "Draft run nov_care for November 2026, pay date December 1. Jo Lin (jo) worked 10 hours at 12, no adjustments, rule sample_pay.",
  ),
  read("Finalise the November plant-care pay run.", { address: "p1/finalize", action: "press" }),
  read("Send Sam's payslip.", { address: "p1/r1/send", action: "press" }, 1),
] satisfies c.Probe[];

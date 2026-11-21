import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { payrollDisplay, payrollGates, payrollRead, validGross } from "../copy";
import { booksWordsFor } from "../lang";
import { dateTime, distinct, periodFields, ref, seedPeriod, seedTitle, validPeriod } from "../seeds";

// Core first: People/rows cannot calculate or freeze pay runs, record net payments or send payslips.
// prettier-ignore
export const meta = {
  id: "Payroll", status: "ready", group: "data",
  purpose: "Calculate, finalise and retain a small business's pay run.",
  pick: "A business pay run with hourly or salary inputs, adjustments, deductions and employer costs; finalise it or open payslips. Not a people directory (People), a staff time record (Timesheet), clock-in (TimeClock), or project time (TimeLog).",
  writeHints: [
    "Use unique snake_case employeeRefs and one to six payees. Hourly payees require hours (0–744); omit hours for salary and use the period salary as rate.",
    "Do not write computed gross, deductions, net pay or employer costs. A paidAt requires a finalizedAt, with offset datetimes, and a run with a recorded payment cannot be voided.",
    'Use style "payslip" for one payee selected by the host (first in payees); otherwise use "run".',
    'Use detail "brief" only when asked to hide pay basis, rate and hours; keep those input fields. Leave unrequested variant axes null.',
  ],
  region: "body", weight: 3, dense: true, tier: "phone",
  realPath: "Payroll uses local pay records and rules; sending payslips needs messaging, not a bank.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["basis", "rate", "hours"] } },
  parts: ["root", "title", "status", "from", "to", "pay_date", "gross", "deductions", "net_pay", "employer_cost", "notice", "finalize", "finalize_label", "void", "void_label"],
  items: {
    key: "payees", visibleWhen: { visible: true },
    parts: ["root", "name", "basis", "rate", "hours", "adjustments", "gross", "deductions", "net_pay", "employer_cost", "paid", "payslip_cue", "record", "record_label", "send", "send_label"],
  },
  partTiers: { send: "service" }, confirmParts: ["finalize", "void"],
  states: ["filled", "empty", "loading", "success", "error"],
  actions: {
    parts: { finalize: ["press"], void: ["press"] },
    items: { root: ["press"], record: ["press"], send: ["press"] },
    when: {
      root: { style: "run" }, finalize: { canFinalize: true }, void: { canVoid: true },
      record: { canRecord: true }, send: { activeFinal: true },
    },
  },
  readSuccess: true, successActions: ["root.press", "record.press", "send.press", "void.press"],
  deviceData: ["books_payroll_rules"],
  previewDeviceData: () => ({ books_payroll_rules: [{ currency: "GBP", rates: { sample_pay: { deductionRate: 0.15, employerRate: 0.10 } } }] }),
  read: (input, state, lang, data): string[] => payrollRead(input as PayrollProps, state, data, lang),
} as const satisfies c.Meta;

const recordRef = ref.meta({ kind: "ref" });
// prettier-ignore
const payee = z.strictObject({
    employeeRef: recordRef, name: c.text(24), basis: z.enum(["hourly", "salary"]), rate: z.number().nonnegative(),
    hours: z.number().min(0).max(744).optional(), ruleRef: recordRef, paidAt: dateTime.optional(),
    adjustments: z.array(z.strictObject({ label: c.text(20), amount: z.number() })).min(0).max(3),
  })
  .refine(({ basis, hours }) => (basis === "hourly") === (hours !== undefined), { path: ["hours"] })
  .refine(validGross, { path: ["adjustments"], message: "Gross pay must be nonnegative and finite" });

// prettier-ignore
const schema = z.strictObject({
  ...c.variantProps(meta.variants), runRef: recordRef, ...periodFields, payDate: c.isoDate,
  payees: z.array(payee).min(1).max(6), finalizedAt: dateTime.optional(),
  voided: z.boolean().default(false), style: z.enum(["run", "payslip"]).default("run"),
})
  .refine(validPeriod, { path: ["to"], message: "Use an ordered period of at most 366 days" })
  .refine(({ payees, finalizedAt, voided }) =>
    distinct(payees, ({ employeeRef }) => employeeRef) &&
    payees.every(({ paidAt }) => !paidAt || (!voided && !!finalizedAt && Date.parse(paidAt) >= Date.parse(finalizedAt))),
    { path: ["payees"], message: "Payees must be unique; payments require an active finalized run" },
  );

export const props = schema.overwrite(payrollGates) as typeof schema &
  z.ZodType<ReturnType<typeof payrollGates<z.output<typeof schema>>>, z.input<typeof schema>>;

// prettier-ignore
export function fallback(input: c.FallbackInput): z.input<typeof props> {
  return {
    runRef: "item_1", ...seedPeriod, payDate: seedPeriod.to,
    payees: [{ employeeRef: "item_2", name: seedTitle(input, 24), basis: "salary", rate: 0, adjustments: [], ruleRef: "item_3" }],
  };
}

// prettier-ignore
export const examples = [
  { runRef: "nov_care", from: "2026-11-01", to: "2026-11-30", payDate: "2026-12-01", payees: [
    { employeeRef: "jo", name: "Jo Lin", basis: "hourly", rate: 12, hours: 10,
      adjustments: [], ruleRef: "sample_pay" },
    { employeeRef: "mira", name: "Mira Cole", basis: "salary", rate: 640,
      adjustments: [], ruleRef: "sample_pay" },
  ] },
  { runRef: "nov_walks", from: "2026-11-01", to: "2026-11-30", payDate: "2026-12-01", style: "payslip",
    density: "compact", finalizedAt: "2026-12-01T09:00:00Z", voided: false, payees: [
      { employeeRef: "sam", name: "Sam Moss", basis: "salary", rate: 850,
        adjustments: [{ label: "Weekend cover", amount: 45 }], ruleRef: "sample_pay", paidAt: "2026-12-01T12:00:00Z" },
    ] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Payroll");
// prettier-ignore
const careBrief = "Draft run nov_care for November 2026, pay date December 1. Jo Lin (jo) worked 10 hours at 12, no adjustments, rule sample_pay.";
// prettier-ignore
export const probes = [
  choose("Calculate my staff's pay from hours or salary, with deductions and employer costs, then let me finalise the run and issue payslips."),
  choose("List the names and faces of the people on my team as a directory and let me open a person.", "People"),
  write(careBrief),
  {
    ...write(`${careBrief} Keep all inputs, but don't show pay basis, rate or hours in the preview.`),
    variant: { axis: "detail", value: "brief" },
  },
  read("Finalise the November plant-care pay run.", { address: "p1/finalize", action: "press" }),
  read("Send Sam's payslip.", { address: "p1/r1/send", action: "press" }, 1),
] satisfies c.Probe[];

type PayrollProps = c.Props<typeof props, typeof meta>;
type Display = ReturnType<typeof payrollDisplay<PayrollProps["payees"][number]>>;
type Finish = { density: c.ThemeDensity; loading: boolean };

// prettier-ignore
function PayFigures({ figures, density, loading }: Finish & { figures: Display["totals"] }) {
  const [net, ...rest] = figures, amount = ({ part, label, value }: Display["totals"][number], primary = false) => {
    const numberScale = primary ? "display" : "compact";
    return <kit.KitContent key={part} {...{ density }}>{loading ?
      <kit.KitSkeleton shape="figure" inset="none" {...{ density }} content={[["caption", label], ["number", value, "start", numberScale]]} /> : <>
      <kit.KitText part={null} role="caption" tone="muted">{label}</kit.KitText>
      <kit.KitText {...{ part, density, numberScale }} role="number" tabular>{value}</kit.KitText>
    </>}</kit.KitContent>;
  };
  return <kit.KitRow part={null} label={net!.label} tone="muted" {...{ density }}><kit.KitContent {...{ density }}>
      {amount(net!, true)}
      <kit.KitGrid columns={3} {...{ density }}>{rest.map((figure) => amount(figure))}</kit.KitGrid>
  </kit.KitContent></kit.KitRow>;
}

// prettier-ignore
function PayeeRow({ row, style, loading, density, activeFinal }: Finish & { row: Display["rows"][number]; style: PayrollProps["style"]; activeFinal: boolean }) {
  const { words: { payroll: words } } = kit.useWords(booksWordsFor);
  const { payee, figures, adjustments, paid, detail } = row, run = style === "run";
  const net = figures[0]!;
  return <kit.KitRow item={payee.id} part={null} inline label={payee.name} {...{ density }}><kit.KitContent group="response" {...{ density }}>
      <kit.KitRow part={loading ? null : "root"} role={!loading && run ? "button" : "text"} inline label={payee.name}
        {...{ density }} trailing={run && !loading ? <kit.KitTrail kind="chevron" part="payslip_cue" /> : undefined}>
          <kit.KitGrid fitLast {...{ density }}>{loading ?
            <kit.KitSkeleton shape="figure" inset="none" {...{ density }} content={[["body", payee.name], ["caption", row.basisLine], ["caption", paid]]} /> :
            <kit.KitContent {...{ density }}>
              <kit.KitText part="name" role="body" emphasis="strong">{payee.name}</kit.KitText>
              {detail && <kit.KitText part={null} role="caption" tone="muted">{Object.entries(detail).filter(([, value]) => value !== undefined).map(([part, value], index) =>
                <kit.KitText key={part} {...{ part }} role="caption" tone="muted" tabular>{index ? words.separator : null}{value}</kit.KitText>)}</kit.KitText>}
              {paid && <kit.KitText part="paid" role="caption" tone="good">{paid}</kit.KitText>}
            </kit.KitContent>}
            {run && (loading ? <kit.KitSkeleton shape="figure" inset="none" content={[["number", net.value, "start", "compact"]]} /> :
              <kit.KitText part="net_pay" role="number" numberScale="compact" tabular>{net.value}</kit.KitText>)}
          </kit.KitGrid>
      </kit.KitRow>
      {!run && <>
        <PayFigures {...{ figures, density, loading }} />
        {adjustments.length > 0 && (loading ? <kit.KitSkeleton shape="figure" inset="none" {...{ density }}
          content={[["caption", words.adjustments], ...adjustments.map((line): ["caption", string] => ["caption", line])]} /> :
          <kit.KitRow part="adjustments" label={words.adjustments} inline {...{ density }}><kit.KitContent {...{ density }}>
            <kit.KitText role="body" emphasis="strong" part={null}>{words.adjustments}</kit.KitText>
            {adjustments.map((line, index) => <kit.KitText key={index} part={null} role="caption" tone="muted">{line}</kit.KitText>)}
          </kit.KitContent></kit.KitRow>)}
      </>}
      {activeFinal && <PayButtons {...{ loading, density }} actions={payee.canRecord ? [["record", words.record, "secondary"], ["send", words.send, "quiet"]] : [["send", words.send, "secondary"]]} />}
  </kit.KitContent></kit.KitRow>;
}

type PayButton = [part: string, label: string, kind: "primary" | "secondary" | "quiet" | "danger"];
// prettier-ignore
function PayButtons({ actions, loading, density }: Finish & { actions: PayButton[] }) {
  return actions.length > 0 && <kit.KitContent group="response" {...{ density }}>{actions.map(([part, label, kind]) =>
    loading ? <kit.KitSkeleton key={part} shape="control" {...{ kind, label }} full /> : <kit.KitAction key={part} {...{ part, label, kind }} full />)}
  </kit.KitContent>;
}

// prettier-ignore
export function Payroll(input: PayrollProps) {
  const state = kit.useComponentState(), data = kit.useDeviceData(), loading = state === "loading";
  const { lang, words: { payroll: words } } = kit.useWords(booksWordsFor);
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const payees = c.visibleItems<PayrollProps["payees"][number]>(meta, input);
  const { heading, status, from, to, payDate, totals, rows, notice } = payrollDisplay({ ...input, payees, detail }, data, lang);
  const actions: PayButton[] = state !== "success" && input.canFinalize ? [["finalize", words.finalize, "primary"]] : [];
  if (input.canVoid) actions.push(["void", words.void, "danger"]);
  return <kit.KitCard part="root" padded {...{ density, surface }}>
    {state === "empty" ? <kit.KitEmpty decorativeIcon /> :
      state === "error" ? <kit.KitEmpty decorativeIcon icon="file_text" title={words.errorTitle} sub={words.errorDetail} /> : <>
        <kit.KitContent {...{ density }}>
          {loading ? <kit.KitSkeleton shape="figure" inset="none" {...{ density }} content={[["title", heading], ["caption", status], ["caption", from + words.periodSeparator + to], ["caption", payDate]]} /> : <>
            <kit.KitText part="title" role="title">{heading}</kit.KitText>
            <kit.KitText part="status" role="caption" tone="muted">{status}</kit.KitText>
            <kit.KitText part={null} role="caption" tone="muted">
              <kit.KitText part="from" role="caption" tone="muted">{from}</kit.KitText>{words.periodSeparator}<kit.KitText part="to" role="caption" tone="muted">{to}</kit.KitText>
            </kit.KitText>
            <kit.KitText part="pay_date" role="caption" tone="muted">{payDate}</kit.KitText>
          </>}</kit.KitContent>
        {!loading && notice && <kit.KitText part="notice" role="caption" tone="bad">{notice}</kit.KitText>}
        {input.style === "run" && <PayFigures figures={totals} {...{ density, loading }} />}
        {rows.map((row) => <PayeeRow key={row.payee.id} {...{ row, density, loading }} style={input.style} activeFinal={input.activeFinal} />)}
        <PayButtons {...{ actions, loading, density }} />
      </>}
  </kit.KitCard>;
}

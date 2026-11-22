import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
// prettier-ignore
import { canFinalizePayroll, canVoidPayroll, payrollDisplay, payrollLifecycle, payrollPayee, payrollRead, payrollRow, payrollRows, previewPayroll, validFrozenRun, type PayrollRow } from "../copy";
import { booksWordsFor } from "../lang";
import { dateTime, distinct, periodFields, ref, seedPeriod, seedTitle, validPeriod } from "../seeds";
import { prompt } from "../../../entry/prompt-Payroll.generated";

// Core first: People/rows cannot calculate or freeze pay runs, record net payments or send payslips.
// prettier-ignore
export const meta = {
  id: "Payroll", status: "ready", group: "data",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body", weight: 3, dense: true, tier: "phone",
  realPath: "Payroll uses local pay records and rules; sending payslips needs messaging, not a bank.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["basis", "rate", "hours"] } },
  parts: ["root", "title", "status", "from", "to", "pay_date", "gross", "deductions", "net_pay", "employer_cost", "notice", "finalize", "finalize_label", "void", "void_label"],
  items: {
    key: "payees", visibleWhen: { visible: true }, deviceData: { rows: payrollRows, schema: payrollRow },
    parts: ["root", "name", "basis", "rate", "hours", "adjustments", "gross", "deductions", "net_pay", "employer_cost", "paid", "payslip_cue", "record", "record_label", "send", "send_label"],
  },
  partTiers: { send: "service" }, confirmParts: ["finalize", "void"],
  states: ["filled", "empty", "loading", "success", "error"],
  actions: {
    parts: { finalize: ["press"], void: ["press"] },
    items: { root: ["press"], record: ["press"], send: ["press"] },
    when: {
      root: { style: "run" }, "finalize.press": { canFinalize: true, validFrozenRun: true }, void: { canVoid: true },
      "record.press": { canRecord: true, validFrozenRun: true }, "send.press": { canSend: true, validFrozenRun: true },
    },
  },
  readSuccess: true, successActions: ["root.press", "record.press", "send.press", "void.press"],
  deviceData: ["books_payroll_rules", "books_payroll_runs"],
  deviceDataFlags: { validFrozenRun, canFinalize: canFinalizePayroll, canVoid: canVoidPayroll },
  previewDeviceData: previewPayroll,
  read: (input, state, lang, data): string[] => state === "empty" || state === "loading" ? [] :
    payrollRead({ ...(input as LivePayroll), ...payrollLifecycle(input as c.Values, data ?? {}) }, state, data, lang),
} as const satisfies c.Meta;

const recordRef = ref.meta({ kind: "ref" });
// prettier-ignore
export const props = z.strictObject({
  ...c.variantProps(meta.variants), runRef: recordRef, ...periodFields, payDate: c.isoDate,
  payees: z.array(payrollPayee).min(1).max(6), finalizedAt: dateTime.optional(),
  voided: z.boolean().default(false), style: z.enum(["run", "payslip"]).default("run"),
})
  .refine(validPeriod, { path: ["to"], message: "Use an ordered period of at most 366 days" })
  .refine(({ payees, finalizedAt, voided }) =>
    distinct(payees, ({ employeeRef }) => employeeRef) &&
    payees.every(({ paidAt }) => !paidAt || (!voided && !!finalizedAt && Date.parse(paidAt) >= Date.parse(finalizedAt))),
    { path: ["payees"], message: "Payees must be unique; payments require an active finalized run" },
  );

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
type LivePayroll = Omit<PayrollProps, "payees"> & {
  payees: PayrollRow[];
  canFinalize?: boolean;
  canVoid?: boolean;
  validFrozenRun?: boolean;
};
type Display = ReturnType<typeof payrollDisplay<PayrollRow>>;
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
  return <kit.KitContent group="response" {...{ density }}><kit.KitRow part={null} label={net!.label} tone="muted" {...{ density }}><kit.KitContent {...{ density }}>
      {amount(net!, true)}
      <kit.KitGrid columns={3} {...{ density }}>{rest.map((figure) => amount(figure))}</kit.KitGrid>
  </kit.KitContent></kit.KitRow></kit.KitContent>;
}
// prettier-ignore
function PayeeRow({ row, style, loading, density, activeFinal }: Finish & { row: Display["rows"][number]; style: PayrollProps["style"]; activeFinal: boolean }) {
  const { words: { payroll: words } } = kit.useWords(booksWordsFor);
  const { payee, figures, adjustments, paid, detail, basisLine } = row, run = style === "run";
  const net = figures[0]!;
  return <kit.KitRow item={payee.id} part={null} inline label={payee.name} {...{ density }}><kit.KitContent group="response" {...{ density }}>
      <kit.KitRow part={loading ? null : "root"} role={!loading && run ? "button" : "text"} inline label={payee.name}
        {...{ density }} trailing={run && !loading ? <kit.KitTrail kind="chevron" part="payslip_cue" /> : undefined}>
          <kit.KitContent {...{ density }}>
            <kit.KitGrid fitLast {...{ density }}>
              {loading ? <kit.KitSkeleton shape="figure" inset="none" {...{ density }} content={[["body", payee.name]]} /> :
                <kit.KitText part="name" role="body" emphasis="strong">{payee.name}</kit.KitText>}
              {run && (loading ? <kit.KitSkeleton shape="figure" inset="none" content={[["number", net.value, "end", "compact"]]} /> :
                <kit.KitText part="net_pay" role="number" numberScale="compact" tabular>{net.value}</kit.KitText>)}
            </kit.KitGrid>
            {loading ? <kit.KitSkeleton shape="figure" inset="none" {...{ density }} content={[["caption", basisLine], ["caption", paid]]} /> : <>
              {detail && <kit.KitText part="rate" role="caption" tone="muted" tabular>
                <kit.KitText part="basis" role="caption" tone="muted">{detail.basis}</kit.KitText>{words.separator}{detail.rate}
                {detail.hours && <>{words.separator}<kit.KitText part="hours" role="caption" tone="muted" tabular>{detail.hours}</kit.KitText></>}
              </kit.KitText>}
              {paid && <kit.KitText part="paid" role="caption" tone="good">{paid}</kit.KitText>}
            </>}
          </kit.KitContent>
      </kit.KitRow>
      {!run && <>
        <PayFigures {...{ figures, density, loading }} />
        {adjustments.length > 0 && <kit.KitContent group="response" {...{ density }}>{loading ? <kit.KitSkeleton shape="figure" inset="none" {...{ density }}
          content={[["caption", words.adjustments], ...adjustments.map((line): ["caption", string] => ["caption", line])]} /> :
          <kit.KitRow part="adjustments" label={words.adjustments} inline {...{ density }}><kit.KitContent {...{ density }}>
            <kit.KitText role="body" emphasis="strong" part={null}>{words.adjustments}</kit.KitText>
            {adjustments.map((line, index) => <kit.KitText key={index} part={null} role="caption" tone="muted">{line}</kit.KitText>)}
          </kit.KitContent></kit.KitRow>}</kit.KitContent>}
      </>}
      {activeFinal && payee.canSend && <PayButtons {...{ loading, density }} actions={payee.canRecord ? [["record", words.record, "secondary"], ["send", words.send, "quiet"]] : [["send", words.send, "secondary"]]} />}
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
  const density = kit.useVariant("density", meta.variants.density, input.density), surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail), live = kit.useLiveControls(meta, input) as LivePayroll;
  const payees = c.visibleItems<PayrollRow>(meta, live);
  const { heading, status, from, to, payDate, totals, rows, notice } = payrollDisplay({ ...input, ...payrollLifecycle(input, data), payees, detail }, data, lang);
  const actions: PayButton[] = state !== "success" && live.canFinalize && live.validFrozenRun ? [["finalize", words.finalize, "primary"]] : [];
  return <kit.KitCard part="root" padded {...{ density, surface }}>
    {state === "empty" ? <kit.KitEmpty decorativeIcon /> :
      state === "error" ? <kit.KitEmpty decorativeIcon icon="file_text" title={words.errorTitle} sub={words.errorDetail} /> : <>
        <kit.KitContent {...{ density }}>
          {loading ? <kit.KitSkeleton shape="figure" inset="none" {...{ density }} content={[["body", heading], ["caption", status], ["caption", from + words.periodSeparator + to], ["caption", payDate]]} /> : <>
            <kit.KitText part="title" role="body" emphasis="strong">{heading}</kit.KitText>
            <kit.KitText part="status" role="caption" tone="muted">{status}</kit.KitText>
            <kit.KitText part={null} role="caption" tone="muted">
              <kit.KitText part="from" role="caption" tone="muted">{from}</kit.KitText>{words.periodSeparator}<kit.KitText part="to" role="caption" tone="muted">{to}</kit.KitText>
            </kit.KitText>
            <kit.KitText part="pay_date" role="caption" tone="muted">{payDate}</kit.KitText>
          </>}</kit.KitContent>
        {!loading && notice && <kit.KitText part="notice" role="caption" tone="bad">{notice}</kit.KitText>}
        {input.style === "run" && <PayFigures figures={totals} {...{ density, loading }} />}
        {rows.map((row) => <PayeeRow key={row.payee.id} {...{ row, density, loading }} style={input.style} activeFinal={Boolean(live.validFrozenRun)} />)}
        <PayButtons {...{ actions, loading, density }} />
        {live.canVoid && <PayButtons {...{ loading, density }} actions={[["void", words.void, "danger"]]} />}
      </>}
  </kit.KitCard>;
}

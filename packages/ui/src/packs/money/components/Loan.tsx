import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { loanCadences, loanCopy, loanReading } from "../copy";
import { moneyWordsFor } from "../lang";
export const meta = {
  id: "Loan",
  status: "ready",
  group: "data",
  purpose: "Understand one debt's terms, remaining principal and projected repayment schedule.",
  pick: "One debt's terms and calculated principal, interest and installment forecast, including interest-free borrowing and Pay-in-4. Not one amount owed (Amount), recorded repayment progress (Progress), a recent balance trend (Sparkline), reminders (Bills), belongings (Loans), or debt priority (Payoff).",
  writeHints: [
    "Write opening principal > 0, nominal annual rate 0–100, payment per period > 0, firstDue YYYY-MM-DD, and at most six recorded payments with due and positive amount. No currency, balance, interest totals, schedule or finish date.",
    "Use detail full only when asked to list upcoming installments; otherwise leave detail null for a summary. For a schedule without a spacing request, density must be null, not comfortable.",
    'If asked for a Pay-in-4 or installments plan, use style "installments" and leave detail null. Set cadence to weekly, biweekly (every two weeks) or monthly when specified; null otherwise. Do not invent a payment cadence.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath:
    "Opening terms and payment records saved on the device; code estimates monthly interest and repayments, never transfers money.",
  variants: { detail: ["brief", "full"], density: ["comfortable", "compact"] },
  variantParts: { "detail.full": { adds: ["schedule"] } },
  parts: ["root", "name", "principal", "rate", "payment", "balance", "next", "finish", "schedule", "edit"],
  states: ["filled", "loading", "success", "error"],
  actions: { parts: { edit: ["press"] }, when: { edit: { linked: true } } },
  read(input, state, lang?: string): string[] {
    const parsed = input as z.output<typeof props>;
    return parsed.detail ? loanReading(parsed, state, lang) : [];
  },
} as const satisfies c.Meta;
const paymentRecord = z.strictObject({ due: c.isoDate, amount: z.number().positive() });
export const loanSource = z.strictObject({
  name: c.text(24),
  principal: z.number().positive(),
  rate: z.number().min(0).max(100),
  payment: z.number().positive(),
  firstDue: c.isoDate,
  payments: z.array(paymentRecord).min(0).max(6),
});
export const props = loanSource
  .extend({
    goto: c.screenId.optional(),
    cadence: z.enum(loanCadences).optional(),
    style: z.enum(["installments"]).optional(),
    ...c.variantProps(meta.variants),
  })
  .overwrite((value) => ({ ...value, linked: value.goto !== undefined }));
export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const item = c.itemsOf(cast, 1)[0];
  return {
    name: (item && c.titleOf(item, 24, thing)) || c.placeholderTitle(0, lang),
    principal: 1,
    rate: 0,
    payment: 1,
    firstDue: "2026-12-01",
    payments: [],
  };
}
// prettier-ignore
const carLoan = { name: "Trot car loan", principal: 6000, rate: 6, payment: 250,
  firstDue: "2026-12-01", payments: [], goto: "terms" };
// prettier-ignore
export const examples = [
  {
    name: "Ledge supplies card", principal: 1200, rate: 18.9, payment: 100, firstDue: "2026-11-01",
    payments: [{ due: "2026-11-01", amount: 100 }], goto: "terms",
  },
  { ...carLoan, detail: "full" },
  { name: "Home mortgage", principal: 180000, rate: 4.5, payment: 1100,
    firstDue: "2026-12-01", payments: [] },
  {
    name: "Ana's friend loan", principal: 480, rate: 0, payment: 40, firstDue: "2026-11-01",
    payments: [{ due: "2026-11-01", amount: 40 }], goto: "friend_terms", detail: "full",
  },
  { ...carLoan, detail: "full", density: "compact" },
  { name: "Trot rain gear", principal: 120, rate: 0, payment: 30, firstDue: "2026-12-14",
    payments: [], cadence: "biweekly", style: "installments" },
  { ...carLoan, name: "Trot van loan", cadence: "weekly", payment: 70 },
] satisfies z.input<typeof props>[];
const { choose, write, read } = c.probesFor("Loan");
// prettier-ignore
export const probes = [
  choose("Given my car debt's opening principal, annual interest rate and monthly payment, calculate the next principal and interest split and projected instalment schedule"),
  choose("I already know I owe my friend $80. Display $80 as one big currency figure; no calculations, rates, payment breakdown, or forecast", "Amount"),
  choose("Show how much I've already paid toward each fixed repayment target: $120 of $500 and $80 of $200. Give each target its own bar that fills toward its goal, with no interest or forecast", "Progress"),
  choose("Put a tiny unlabeled line graph of my last eight weekly balances beside the latest figure so I can see the trend. No axes, loan terms, or forecast", "Sparkline"),
  choose("Remind me about upcoming electricity and rent payments with paid ticks, no debt interest", "Bills"),
  choose("Prioritise several debts and allocate extra monthly money until all are cleared", "Payoff"),
  write("Car loan opening principal 6000, annual rate 6 percent, monthly payment 250, first due 2026-12-01, no recorded payments. Show schedule, edit opens terms. Write no computed balance or forecast"),
  {
    ...write("For my car loan of 6000 at 6% with monthly payments of 250 starting 2026-12-01 and no payments yet, list the upcoming installments, not just the next one."),
    variant: { axis: "detail", value: "full" },
  },
  { ...write("My equipment loan started at 1200, 6% APR, with a 50 payment every week starting 2026-12-01. None recorded. Show the balance and next payment."), expectProps: { cadence: "weekly" } },
  { ...write("Show my zero-interest Pay-in-4 plan as installments: 120 originally, 30 every two weeks, first due 2026-12-14, no payments yet."), expectProps: { style: "installments", rate: 0, cadence: "biweekly" } },
  read("Edit the Ledge supplies card terms", { address: "l1/edit", action: "press" }),
] satisfies c.Probe[];
type LoanCopy = ReturnType<typeof loanCopy>;
type LoanWords = ReturnType<typeof moneyWordsFor>;

// The filled and loading versions share line roles and layout, including wrap height.
type LineProps = {
  role: "label" | "caption" | "number" | "title";
  children: string;
  part?: string | null;
  tone?: "muted" | "good" | "bad";
  tabular?: boolean;
  density: c.ThemeDensity;
};
function LoanLine({ role, part = null, children, density, ...props }: LineProps) {
  return kit.useComponentState() === "loading" ? (
    <kit.KitSkeleton shape="figure" inset="none" density={density} content={[[role, children]]} />
  ) : (
    <kit.KitText {...{ role, part, children, density, ...props }} />
  );
}
type ForecastProps = { copy: LoanCopy; words: LoanWords; loading: boolean; density: c.ThemeDensity };
function Forecast({ copy, words, loading, density }: ForecastProps) {
  const { installments } = copy;
  // prettier-ignore
  return (
    <>
      {!installments && <kit.KitContent density={density} group="response">
        {copy.next && (
          <kit.KitRow density={density} inline part={loading ? null : "next"} label={loading ? "" : copy.next.headline} lineRole="label">
            <LoanLine density={density} role="label" children={copy.next.headline} />
            <LoanLine density={density} role="caption" tone="muted" children={copy.next.split} />
          </kit.KitRow>
        )}
        <LoanLine density={density} role="label" part="finish" children={copy.finish} />
      </kit.KitContent>}
      {copy.schedule.length > 0 && (
        <kit.KitContent density={density} group="response">
          <LoanLine density={density} role="label" part="schedule" children={copy.scheduleLabel} />
          {copy.schedule.map(({ due, date, payment, remaining, split }) => (
            <kit.KitRow density={density} key={due} inline lineRole="label" label={loading ? "" : words.loanRow(date, remaining, split, payment)}>
              <kit.KitGrid density={density} fitLast>
                <LoanLine density={density} role="caption" children={date} />
                <LoanLine density={density} role="label" tabular children={payment ?? remaining} />
              </kit.KitGrid>
              {payment && <LoanLine density={density} role="caption" tone="muted" children={remaining} />}
              {split && <LoanLine density={density} role="caption" tone="muted" children={split} />}
            </kit.KitRow>
          ))}
          {copy.more && <LoanLine density={density} role="caption" tone="muted" children={copy.more} />}
        </kit.KitContent>
      )}
      <kit.KitContent density={density} group={copy.schedule.length ? "response" : "content"}>
        {installments && <LoanLine density={density} role="label" part="finish" children={copy.finish} />}
        <LoanLine density={density} role="caption" tone="muted" children={words.loanLabels.estimate} />
      </kit.KitContent>
    </>
  );
}
export function Loan(input: c.Props<typeof props, typeof meta>) {
  const state = kit.useComponentState();
  const { lang, words } = kit.useWords(moneyWordsFor);
  const { loanLabels } = words;
  const copy = loanCopy(input, state, lang);
  const { goto } = input;
  const loading = state === "loading";
  const density = kit.useVariant("density", meta.variants.density, input.density);
  // prettier-ignore
  return (
    <kit.KitCard part="root" padded density={density}>
      <kit.KitContent density={density}>
        <LoanLine density={density} role="label" part="name" children={input.name} />
        {copy.headline && <LoanLine density={density} role="title" tone={copy.headline === loanLabels.cleared ? "good" : "bad"} children={copy.headline} />}
        {copy.notice && <LoanLine density={density} role="caption" tone="muted" children={copy.notice} />}
        {copy.balance !== undefined && (
          <>
            <LoanLine density={density} role="number" part="balance" tabular children={copy.balance} />
            <LoanLine density={density} role="caption" tone="muted" children={loanLabels.balance} />
          </>
        )}
      </kit.KitContent>
      <kit.KitContent density={density} group="response">
        {copy.terms.map(({ part, text }) => (
          <LoanLine density={density} key={part} part={part} role="caption" tone="muted" children={text} />
        ))}
      </kit.KitContent>
      {!copy.headline && <Forecast {...{ copy, words, loading, density }} />}
      {goto && loading && <kit.KitSkeleton shape="control" kind="secondary" label={loanLabels.edit} full />}
      {goto && state === "filled" && <kit.KitAction kind="secondary" part="edit" label={loanLabels.edit} goto={goto} full />}
    </kit.KitCard>
  );
}

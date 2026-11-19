import { z } from "zod";
import {
  isoDate,
  itemsOf,
  placeholderTitle,
  probesFor,
  screenId,
  text,
  thingOf,
  titleOf,
} from "../../../catalog";
import type { FallbackInput, Meta, Probe, Props } from "../../../catalog";
import {
  KitAction,
  KitCard,
  KitContent,
  KitGrid,
  KitRow,
  KitSkeleton,
  KitText,
  useComponentState,
  useWords,
} from "../../../kit";
import { loanCopy, loanReading } from "../copy";
import { moneyWordsFor } from "../lang";

// Core first: Amount/large cannot compute monthly interest, instalments or a debt's projected finish.
export const meta = {
  id: "Loan",
  status: "ready",
  group: "data",
  purpose: "Understand one debt's terms, remaining principal and projected repayment schedule.",
  pick: "One debt's terms and calculated principal, interest and monthly instalment forecast, including interest-free borrowing. Not one amount owed (Amount), recorded repayment progress (Progress), a recent balance trend (Sparkline), reminders (Bills), belongings (Loans), or debt priority (Payoff).",
  writeHints: [
    "Write opening principal > 0, nominal annual rate 0–100, monthly payment > 0, firstDue YYYY-MM-DD, and at most six recorded payments with due and positive amount. No currency, balance, interest totals, schedule or finish date.",
    "style is summary or schedule. Fixed-rate monthly estimates are computed locally, not lender statements or transfers.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath:
    "Opening terms and payment records saved on the device; code estimates monthly interest and repayments, never transfers money.",
  parts: ["root", "name", "principal", "rate", "payment", "balance", "next", "finish", "schedule", "edit"],
  states: ["filled", "loading", "success", "error"],
  actions: { parts: { edit: ["press"] }, when: { edit: { linked: true } } },
  read(input, state, lang?: string) {
    const parsed = input as z.output<typeof props>;
    // The shared reader parses defaults first; a raw fallback has no selected style yet.
    return parsed.style ? loanReading(parsed, state, lang) : [];
  },
} as const satisfies Meta;

const paymentRecord = z.strictObject({ due: isoDate, amount: z.number().positive() });
export const loanSource = z.strictObject({
  name: text(24),
  principal: z.number().positive(),
  rate: z.number().min(0).max(100),
  payment: z.number().positive(),
  firstDue: isoDate,
  payments: z.array(paymentRecord).min(0).max(6),
});

export const props = loanSource
  .extend({
    goto: screenId.optional(),
    style: z.enum(["summary", "schedule"]).default("summary"),
  })
  .overwrite((value) => ({ ...value, linked: value.goto !== undefined }));

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const item = itemsOf(cast, 1)[0];
  return {
    name: (item && titleOf(item, 24, thing)) || placeholderTitle(0, lang),
    principal: 1,
    rate: 0,
    payment: 1,
    firstDue: "2026-12-01",
    payments: [],
  };
}

// prettier-ignore
export const examples = [
  {
    name: "Ledge supplies card", principal: 1200, rate: 18.9, payment: 100, firstDue: "2026-11-01",
    payments: [{ due: "2026-11-01", amount: 100 }], goto: "terms", style: "summary",
  },
  { name: "Trot car loan", principal: 6000, rate: 6, payment: 250,
    firstDue: "2026-12-01", payments: [], style: "schedule" },
  { name: "Home mortgage", principal: 180000, rate: 4.5, payment: 1100,
    firstDue: "2026-12-01", payments: [], style: "summary" },
  {
    name: "Ana's friend loan", principal: 480, rate: 0, payment: 40, firstDue: "2026-11-01",
    payments: [{ due: "2026-11-01", amount: 40 }], goto: "friend_terms", style: "schedule",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("Loan");
// prettier-ignore
export const probes = [
  choose("Given my car debt's opening principal, annual interest rate and monthly payment, calculate the next principal and interest split and projected instalment schedule"),
  choose("Show one big figure for the amount I owe my friend; no interest terms or repayment forecast", "Amount"),
  choose("Show how much I've already paid toward each fixed repayment target: $120 of $500 and $80 of $200. Give each target its own bar that fills toward its goal, with no interest or forecast", "Progress"),
  choose("Show a tiny line of my recent outstanding balances beside the latest value, no forecast or loan terms", "Sparkline"),
  choose("Remind me about upcoming electricity and rent payments with paid ticks, no debt interest", "Bills"),
  choose("Prioritise several debts and allocate extra monthly money until all are cleared", "Payoff"),
  write("Car loan opening principal 6000, annual rate 6 percent, monthly payment 250, first due 2026-12-01, no recorded payments. Show schedule, edit opens terms. Write no computed balance or forecast"),
  read("Edit the Ledge supplies card terms", { address: "l1/edit", action: "press" }),
] satisfies Probe[];

type LoanCopy = ReturnType<typeof loanCopy>;
type LoanWords = ReturnType<typeof moneyWordsFor>;

// The filled and loading versions share line roles and layout, including wrap height.
type LineProps = {
  role: "label" | "caption" | "number" | "title";
  children: string;
  part?: string | null;
  tone?: "muted" | "good";
  tabular?: boolean;
};
function LoanLine({ role, part = null, children, ...props }: LineProps) {
  return useComponentState() === "loading" ? (
    <KitSkeleton shape="figure" inset="none" content={[[role, children]]} />
  ) : (
    <KitText {...{ role, part, children, ...props }} />
  );
}

function Forecast({ copy, words, loading }: { copy: LoanCopy; words: LoanWords; loading: boolean }) {
  const { loanLabels } = words;
  // prettier-ignore
  return (
    <>
      <KitContent group="response">
        {copy.next && (
          <KitRow inline part={loading ? null : "next"} label={loading ? "" : copy.next.headline} lineRole="label">
            <LoanLine role="label" children={copy.next.headline} />
            <LoanLine role="caption" tone="muted" children={copy.next.split} />
          </KitRow>
        )}
        <LoanLine role="label" part="finish" children={copy.finish} />
      </KitContent>
      {copy.schedule.length > 0 && (
        <KitContent group="response">
          <LoanLine role="label" part="schedule" children={loanLabels.schedule} />
          {copy.schedule.map(({ due, date, remaining, split }) => (
            <KitRow key={due} inline lineRole="label" label={loading ? "" : words.loanRow(date, remaining, split)}>
              <KitGrid fitLast>
                <LoanLine role="label" children={date} />
                <LoanLine role="label" tabular children={remaining} />
              </KitGrid>
              <LoanLine role="caption" tone="muted" children={split} />
            </KitRow>
          ))}
          {copy.more && <LoanLine role="caption" tone="muted" children={copy.more} />}
        </KitContent>
      )}
      <LoanLine role="caption" tone="muted" children={loanLabels.estimate} />
    </>
  );
}

export function Loan(input: Props<typeof props, typeof meta>) {
  const state = useComponentState();
  const { lang, words } = useWords(moneyWordsFor);
  const { loanLabels } = words;
  const copy = loanCopy(input, state, lang);
  const { goto } = input;
  const loading = state === "loading";
  // prettier-ignore
  return (
    <KitCard part="root" padded>
      <KitContent>
        <LoanLine role="label" part="name" children={input.name} />
        {copy.paidOff && <LoanLine role="title" tone="good" children={loanLabels.cleared} />}
        {copy.balance !== undefined && (
          <>
            <LoanLine role="number" part="balance" tabular children={copy.balance} />
            <LoanLine role="caption" tone="muted" children={loanLabels.balance} />
          </>
        )}
      </KitContent>
      <KitContent group="response">
        {copy.terms.map(({ part, text }) => (
          <LoanLine key={part} part={part} role="caption" tone="muted" children={text} />
        ))}
      </KitContent>
      {!copy.paidOff && (copy.notice ? (
        <KitContent group="response">
          <LoanLine role="label" children={copy.notice} />
        </KitContent>
      ) : <Forecast {...{ copy, words, loading }} />)}
      {goto && loading && <KitSkeleton shape="control" kind="secondary" label={loanLabels.edit} full />}
      {goto && state === "filled" && <KitAction kind="secondary" part="edit" label={loanLabels.edit} goto={goto} full />}
    </KitCard>
  );
}

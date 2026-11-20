import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { payoffChoices, payoffCopy, payoffReading, payoffSelection, payoffStrategies } from "../copy";
import { moneyWordsFor } from "../lang";
import { examples as loanExamples, loanSource } from "./Loan";
export const meta = {
  id: "Payoff",
  status: "ready",
  group: "data",
  purpose: "Plan a monthly budget and repayment priority to clear your debts.",
  pick: "Allocate regular payments plus extra across debts and forecast clearance by high rate or small balance. Not one debt's instalment breakdown (Loan), static repayment progress (Progress), a recent balance trend (Sparkline), or group settle-ups (Split).",
  writeHints: [
    "Each debt uses name, opening principal > 0, annual rate 0–100, payment > 0, firstDue YYYY-MM-DD and 0–6 positive payment records with due and amount. Never write currency, balances, budget, allocation, order, clearance dates or chart points.",
    "extra is a nonnegative additional monthly amount. strategy is high_rate or small_balance; never write the runtime-only strategyChoice. To omit only the chart, use detail brief and density null, not comfortable. Fixed-rate estimates never transfer money.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "A local projection from recorded terms and payments, never a transfer or lender statement.",
  variants: { detail: ["full", "brief"], density: ["comfortable", "compact"] },
  variantParts: { "detail.brief": { hides: ["line"] } },
  parts: ["root", "total", "budget", "finish", "line", "strategy", "extra", "edit", "empty", "sub"],
  items: { key: "debts", parts: ["root", "name", "balance", "clearance", "order"] },
  states: ["filled", "empty", "loading", "success", "error"],
  select: { prop: "strategyChoice", choices: { strategy: payoffChoices } },
  set: { extra: { prop: "extra", min: 0 } },
  actions: {
    parts: { strategy: ["select"], extra: ["set"], edit: ["press"] },
    when: { edit: { linked: true } },
  },
  read: (input, state, lang?: string): string[] =>
    state === "filled" ? payoffReading(input as z.output<typeof props>, lang) : [],
} as const satisfies c.Meta;
export const props = z
  .strictObject({
    debts: z.array(loanSource).min(1).max(6),
    extra: z.number().nonnegative().default(0),
    strategy: z.enum(payoffStrategies).default("high_rate"),
    strategyChoice: z.enum(payoffChoices).optional(),
    goto: c.screenId.optional(),
    ...c.variantProps(meta.variants),
  })
  .overwrite((v) => ({ ...v, ...payoffSelection(v.strategy, v.strategyChoice), linked: !!v.goto }));
export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const names = c
    .itemsOf(cast, 3)
    .map((item, index) => c.titleOf(item, 24, thing) || c.placeholderTitle(index, lang));
  if (!names.length) names.push(c.placeholderTitle(0, lang));
  const neutral = { principal: 1, rate: 0, payment: 1, firstDue: "2026-12-01", payments: [] };
  return { debts: names.map((name) => ({ name, ...neutral })) };
}
const [ledge, trot, mortgage, friend] = loanExamples.map((loan) => loanSource.strip().parse(loan));
const card = { ...ledge!, name: "Ledge card" };
const ledgePlan = { debts: [card, mortgage!], extra: 50, strategy: "high_rate", goto: "debts" } as const;
export const examples = [
  { ...ledgePlan, debts: [...ledgePlan.debts] },
  { debts: [trot!, friend!], extra: 30, strategy: "small_balance", detail: "brief" },
  { ...ledgePlan, debts: [...ledgePlan.debts], density: "compact" },
] satisfies z.input<typeof props>[];
const { choose, write, read } = c.probesFor("Payoff");
// prettier-ignore
export const probes = [
  choose("Use my debts' terms, regular monthly payments and an extra monthly amount to prioritise high-interest debts, forecast each clearance month and when I am debt free"),
  choose("Show recorded payments against several fixed repayment goals as separate progress bars, no allocation or future interest calculation", "Progress"),
  choose("Calculate the next principal and interest instalment for one loan from its terms, not a debt-priority plan", "Loan"),
  choose("Show the recent trend of my outstanding balance beside its latest value, not a future repayment forecast", "Sparkline"),
  choose("Calculate who in our shared flat should pay whom after grocery expenses", "Split"),
  write(
    "Plan repayment of Card: principal 1200, rate 18.9, payment 100; Friend: principal 480, rate zero, payment 40. Both first due 2026-12-01 with no recorded payments. Extra monthly 50, high rate priority, edit opens debts. No computed totals",
  ),
  {
    ...write(
      "Plan my payoff for Card, principal 1200, 18.9% annual interest, payment 100 monthly starting 2026-12-01, no payments recorded. Keep the debt-order rows but omit the projected balance chart.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Change the debt repayment priority", { address: "p1/strategy", action: "select" }),
] satisfies c.Probe[];
type PayoffProps = c.Props<typeof props, typeof meta>;
type Summary = ReturnType<typeof payoffCopy>;
type ControlProps = Pick<PayoffProps, "strategyChoice" | "extra" | "goto" | "density">;
function PayoffControls({ strategyChoice, extra, goto, density }: ControlProps) {
  const labels = kit.useWords(moneyWordsFor).words.payoff;
  const state = kit.useComponentState();
  const inactive = state === "filled" ? {} : { disabled: true };
  const chip = { item: null, role: "radio", look: "segment", ...inactive } as const;
  const field = { kind: "number", action: "set", min: 0, part: "extra", ...inactive } as const;
  const editor = { part: "edit", label: labels.edit, goto, kind: "secondary", ...inactive } as const;
  // prettier-ignore
  return (
    <kit.KitContent density={density} group="response">
      <PayoffText density={density} text={labels.strategy} />
      <kit.KitTrack part="strategy" look="segments" role="radiogroup" label={labels.strategy}>
        {payoffChoices.map((value, index) => (
          <kit.KitChip key={value} {...chip} value={value} label={labels.choice[payoffStrategies[index]!]} on={strategyChoice === value} />
        ))}
      </kit.KitTrack>
      <kit.KitContent density={density} group="response">
        <PayoffText density={density} text={labels.extra} />
        {state === "loading"
          ? <kit.KitSkeleton shape="control" kind="secondary" full />
          : <kit.KitInput {...field} hint={labels.extra} value={String(extra)} />}
      </kit.KitContent>
      {goto && <kit.KitContent density={density} group="response" children={<kit.KitAction {...editor} />} />}
    </kit.KitContent>
  );
}
type TextProps = {
  text: string;
  role?: "label" | "title" | "body" | "number";
  part?: string | null;
  tone?: "muted" | "text" | "bad";
  numberScale?: "compact";
  density: PayoffProps["density"];
};
function PayoffText({ text, role = "label", part = null, tone = "muted", numberScale, density }: TextProps) {
  if (kit.useComponentState() === "loading") {
    const scale = numberScale ?? "display";
    return (
      <kit.KitSkeleton
        shape="figure"
        inset="none"
        density={density}
        content={[[role, text, "start", scale]]}
      />
    );
  }
  const draw = { density, role, part, tone, ...(numberScale ? { numberScale } : {}) };
  return <kit.KitText {...draw} lines={1} tabular children={text} />;
}
// prettier-ignore
function PayoffRows({ debts, rows, density }: Pick<PayoffProps, "debts" | "density"> & { rows: Summary["rows"] }) {
  const loading = kit.useComponentState() === "loading";
  return rows.map(({ index, order, balance, clearance }) => {
    const { id, name } = debts[index]!;
    const target = { item: id, part: loading ? null : ("root" as const), label: loading ? "" : name };
    const rank = <PayoffText density={density} role="body" part="order" text={order} />;
    const trailing = <PayoffText density={density} {...amountStyle} part="balance" text={balance} />;
    return (
      <kit.KitRow density={density} key={id} {...target} leading={rank} trailing={trailing} inline>
        <PayoffText density={density} role="body" tone="text" part="name" text={name} />
        <PayoffText density={density} part="clearance" text={clearance} />
      </kit.KitRow>
    );
  });
}
const amountStyle = { role: "number", numberScale: "compact", tone: "text" } as const;
export function Payoff(input: PayoffProps) {
  const state = kit.useComponentState();
  const { lang, words } = kit.useWords(moneyWordsFor);
  const labels = words.payoff;
  const density = kit.useVariant("density", meta.variants.density, input.density);
  if (state === "empty" || state === "success") {
    const cleared = { part: "finish", title: labels.cleared };
    const empty = { part: "empty", sub: labels.emptyHelp };
    const message = state === "empty" ? empty : cleared;
    return <kit.KitCard padded density={density} children={<kit.KitEmpty {...message} decorativeIcon />} />;
  }
  if (state === "error") {
    return (
      <kit.KitCard padded density={density}>
        <kit.KitContent density={density}>
          <PayoffText density={density} role="title" tone="bad" part="finish" text={labels.unavailable} />
          <kit.KitText tone="muted" part={null} children={labels.errorHelp} />
        </kit.KitContent>
      </kit.KitCard>
    );
  }
  const { total, budget, finish, rows, series, stalled } = payoffCopy(input, lang);
  const plot = series[0]!;
  const loading = state === "loading";
  const points = loading ? plot.points.map((point) => ({ ...point, value: null })) : plot.points;
  const debts = <PayoffRows density={density} debts={input.debts} rows={rows} />;
  const headline = { role: "title", part: "finish", tone: stalled ? "bad" : "text" } as const;
  const figures = { total: [labels.owed, total], budget: [labels.budget, budget] } as const;
  // prettier-ignore
  return (
    <kit.KitCard padded density={density}>
      <kit.KitContent density={density}>
        <PayoffText density={density} text={labels.finish} />
        <PayoffText density={density} {...headline} text={finish} />
        {Object.entries(figures).map(([part, [label, value]]) => (
          <kit.KitGrid density={density} key={part} fitLast>
            <PayoffText density={density} text={label} />
            <PayoffText density={density} {...amountStyle} part={part} text={value} />
          </kit.KitGrid>
        ))}
      </kit.KitContent>
      {input.detail === "full" && <kit.KitContent density={density}>
        <PayoffText density={density} text={labels.forecast} />
        <kit.KitLinePlot part="line" style="compact" series={[{ ...plot, label: "", points }]} loading={loading} />
      </kit.KitContent>}
      {input.detail === "full" ? <kit.KitContent density={density} group="response" children={debts} /> : debts}
      <PayoffControls {...input} density={density} />
    </kit.KitCard>
  );
}

import { compactMoneyLine, dateLocaleOf, numberLine } from "../../../catalog";
import { moneyWordsFor } from "../lang";
import { projectPayoff, type PayoffSource, type PayoffStrategy } from "./PayoffProjection";

export const payoffStrategies = ["high_rate", "small_balance"] as const;
const { choice } = moneyWordsFor().payoff;
export const payoffChoices = [choice.high_rate, choice.small_balance] as const;
type Input = PayoffSource & { detail: "full" | "brief"; goto?: string | undefined };
type Projection = ReturnType<typeof projectPayoff>;

/** Keep existing action values stable regardless of the display language. */
export function payoffSelection(strategy: PayoffStrategy, strategyChoice?: string) {
  const selected =
    payoffStrategies[strategyChoice === undefined ? -1 : payoffChoices.indexOf(strategyChoice)];
  return { strategy: selected ?? strategy, strategyChoice: choice[selected ?? strategy] };
}

function monthLine(month: number, lang?: string): string {
  const date = new Date(0);
  date.setUTCFullYear(Math.floor(month / 12), month % 12, 1);
  return new Intl.DateTimeFormat(dateLocaleOf(lang), {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function payoffPoints({ points, asOf, total }: Projection, lang?: string) {
  const { current } = moneyWordsFor(lang).payoff;
  const last = points.length - 1;
  const sampleEvery = Math.max(1, Math.ceil(last / 60));
  const max = Math.max(...points);
  const scale = max > Number.MAX_VALUE / 2 ? max : 1;
  return points.flatMap((value, index) =>
    index % sampleEvery === 0 || index === last
      ? [
          {
            id: `m${index}`,
            x: index,
            value: value / scale,
            label: !index ? current : index === last ? monthLine(asOf + last, lang) : "",
          },
        ]
      : [],
  );
}

export function payoffCopy(input: PayoffSource, lang?: string) {
  const plan = projectPayoff(input);
  const words = moneyWordsFor(lang).payoff;
  const money = (amount: number) => compactMoneyLine(amount, undefined, lang);
  return {
    total: money(plan.total),
    budget: money(plan.budget),
    finish: plan.cleared
      ? words.cleared
      : plan.finish === undefined
        ? words.noFinish
        : monthLine(plan.finish, lang),
    stalled: !plan.cleared && plan.finish === undefined,
    series: [{ id: "balance", label: words.forecast, points: payoffPoints(plan, lang) }],
    rows: plan.accounts.map(({ index, opening, clearance }, rank) => ({
      index,
      order: words.rank(numberLine(rank + 1, lang)),
      balance: money(opening),
      clearance:
        clearance === undefined
          ? words.unknown
          : (opening ? words.clearance : words.clearedIn)(monthLine(clearance, lang)),
    })),
  };
}

export function payoffReading(input: Input, lang?: string): string[] {
  const words = moneyWordsFor(lang).payoff;
  const { total, budget, finish, rows, series } = payoffCopy(input, lang);
  return [
    words.finish,
    finish,
    words.owed,
    total,
    words.budget,
    words.budgetRead(budget),
    ...(input.detail === "full"
      ? [words.forecast, ...series[0]!.points.map(({ label }) => label).filter(Boolean)]
      : []),
    ...rows.flatMap(({ order, balance, clearance }) => [order, balance, clearance]),
    words.strategy,
    ...payoffStrategies.map((option) => words.choice[option]),
    ...payoffStrategies.map((option) => words[option]),
    words.extra,
    numberLine(input.extra, lang),
    ...(input.goto ? [words.edit] : []),
  ];
}

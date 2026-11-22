import { moneyLine, numberLine, percentLine, type AppCurrency } from "../../../catalog";
import { dataWordsFor } from "../lang";

type Stage = { label: string; count: number; value?: number | undefined };

function conversion(count: number, base: number, lang?: string) {
  return base > 0 && Number.isFinite((count / base) * 100)
    ? percentLine(count, base, lang)
    : dataWordsFor(lang).funnelUnavailable;
}

export function funnelLines(
  input: { stages: readonly Stage[]; unit?: string | undefined; detail?: string | undefined },
  lang?: string,
  currency?: AppCurrency,
) {
  const { stages, unit, detail } = input;
  const words = dataWordsFor(lang);
  const top = stages[0]?.count ?? 0;
  const rate = conversion(stages.at(-1)?.count ?? 0, top, lang);
  return {
    overall: words.funnelConversion(rate),
    rate,
    stages: stages.map(({ count, value }, index) => ({
      count: unit ? words.chartValue(numberLine(count, lang), unit) : numberLine(count, lang),
      ratio: top ? Math.min(1, count / top) : 0,
      value:
        detail !== "brief" && value !== undefined ? moneyLine(value, currency, undefined, lang) : undefined,
      step: index ? words.funnelFromPrevious(conversion(count, stages[index - 1]!.count, lang)) : undefined,
    })),
  };
}

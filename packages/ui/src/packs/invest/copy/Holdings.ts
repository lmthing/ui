import {
  compactMoneyLine,
  dateLocaleOf,
  localeOf,
  numberLine,
  pluralForm,
  wordsFor,
  type AppCurrency,
} from "../../../catalog";
import { investWordsFor } from "../lang";

type Position = {
  name: string;
  symbol: string;
  units: number;
  unitCost: number;
  price?: number | undefined;
  quotedAt?: string | undefined;
  value?: number | null;
  gain?: number | null;
};

export function holdingCopy(row: Position, lang?: string, currency?: AppCurrency) {
  const { holdings: words } = investWordsFor(lang);
  const money = (value: number | null | undefined) =>
    typeof value === "number" && Number.isFinite(value)
      ? compactMoneyLine(value, currency, lang)
      : words.unknown;
  const { units, unitCost, price, quotedAt } = row;
  const value = row.value === undefined && price !== undefined ? units * price : row.value;
  const gain = row.gain === undefined && price !== undefined ? units * (price - unitCost) : row.gain;
  const gainTone =
    typeof gain !== "number" || !Number.isFinite(gain) || !gain ? "muted" : gain > 0 ? "good" : "bad";
  const formattedUnits = new Intl.NumberFormat(localeOf(lang), {
    maximumSignificantDigits: 10,
    ...(units >= 1e10 || (units > 0 && units < 1e-4) ? { notation: "scientific" } : {}),
  }).format(units);
  const date = quotedAt
    ? new Intl.DateTimeFormat(dateLocaleOf(lang), {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }).format(new Date(quotedAt))
    : words.noQuote;
  return {
    units: words.units(formattedUnits, pluralForm(units, lang) === "one"),
    unitCost: words.unitCost(money(unitCost)),
    price: words.price(money(price)),
    date,
    value: money(value),
    gain: words.gain(gainTone === "good" ? words.positive(money(gain)) : money(gain)),
    gainTone,
  } as const;
}

export function holdingsReading(
  {
    positions,
    detail,
    positionCount,
    quote_service,
  }: {
    positions: readonly Position[];
    detail: "full" | "brief";
    positionCount?: number;
    quote_service?: boolean;
  },
  lang?: string,
  currency?: AppCurrency,
) {
  const { holdings: words } = investWordsFor(lang);
  const lines = positions.flatMap((row) => {
    const copy = holdingCopy(row, lang, currency);
    return [
      row.name,
      row.symbol,
      copy.units,
      [words.valueLabel, copy.value].join(words.valueGap),
      ...(detail === "full"
        ? [copy.unitCost, copy.gain, copy.price, copy.date, ...(row.quotedAt ? [row.quotedAt] : [])]
        : []),
    ];
  });
  const remaining = (positionCount ?? positions.length) - positions.length;
  if (remaining > 0) lines.push(wordsFor(lang).peekCount(numberLine(remaining, lang)));
  if (quote_service) lines.push(words.refresh);
  return lines;
}

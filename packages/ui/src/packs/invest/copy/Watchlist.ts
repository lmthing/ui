import { compactMoneyLine, dateLocaleOf, localeOf } from "../../../catalog";
import { investWordsFor } from "../lang";

type Quote = {
  name: string;
  symbol: string;
  price: number;
  quotedAt: string;
  target?: number | undefined;
  direction?: "at_or_below" | "at_or_above" | undefined;
};

function threshold(quote: Quote, lang?: string) {
  const { price, target, direction = "at_or_below" } = quote;
  if (target === undefined) return;
  const words = investWordsFor(lang).watchlist;
  const met = direction === "at_or_below" ? price <= target : price >= target;
  const ratio = (price - target) / target;
  const side = !Number.isFinite(ratio)
    ? "unknown"
    : price > target
      ? "above"
      : price < target
        ? "below"
        : "equal";
  const change = Number.isFinite(ratio)
    ? new Intl.NumberFormat(localeOf(lang), {
        style: "percent",
        signDisplay: "exceptZero",
        maximumFractionDigits: 2,
        ...(Math.abs(ratio) >= 100 ? { notation: "scientific", maximumSignificantDigits: 3 } : {}),
      }).format(ratio)
    : words.unknown;
  const [lead, amount, tail] = [
    words.targetLead(words.direction[direction]),
    compactMoneyLine(target, undefined, lang),
    words.gapTail(side, met),
  ];
  return { target: lead + amount, gap: change + tail, lead, amount, change, tail, met };
}

export function watchlistQuote(quote: Quote, detail: "brief" | "full", lang?: string) {
  const price = compactMoneyLine(quote.price, undefined, lang);
  const date = new Intl.DateTimeFormat(dateLocaleOf(lang), {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(quote.quotedAt));
  return { price, date, threshold: detail === "full" ? threshold(quote, lang) : undefined };
}

export function watchlistReading(
  input: { items: readonly Quote[]; detail: "brief" | "full" },
  lang?: string,
) {
  const words = investWordsFor(lang).watchlist;
  return input.items.map((quote) => {
    const { price, date, threshold } = watchlistQuote(quote, input.detail, lang);
    return words.reading([
      quote.name,
      [quote.symbol, date].join(words.identitySeparator),
      price,
      ...(threshold ? [threshold.target, threshold.gap] : []),
    ]);
  });
}

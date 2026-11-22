import { compactMoneyLine, moneyLine, numberLine, type AppCurrency, type StateName } from "../../../catalog";
import { placesWordsFor } from "../lang";

type Grade = { label: string; price: number; unit?: string | undefined };
type Charger = { connector: string; kw: number; available: number; total: number };
type Rates<G, C> = { grades?: readonly G[] | undefined; chargers?: readonly C[] | undefined };
type Headline = { grade: Grade } | { available: number; total: number };
type Station<G, C> = Rates<G, C> & {
  name: string;
  brand?: string | undefined;
  distance?: string | undefined;
  updatedAt?: string | undefined;
  detail?: "full" | "brief" | undefined;
  offer?: { cashback: string; claimed: boolean } | undefined;
  goto?: string | undefined;
  headline?: Headline | undefined;
};

export function stationHeadline({ grades, chargers }: Rates<Grade, Charger>): Headline | undefined {
  if (chargers?.length)
    return chargers.reduce(
      (sum, charger) => ({ available: sum.available + charger.available, total: sum.total + charger.total }),
      { available: 0, total: 0 },
    );
  return grades?.[0] ? { grade: grades[0] } : undefined;
}

function gradeValue({ price, unit }: Grade, currency?: AppCurrency, lang?: string) {
  const value =
    price >= 10_000
      ? compactMoneyLine(price, currency, lang)
      : moneyLine(price, currency, undefined, lang, "fixed");
  return unit ? placesWordsFor(lang).stationRates.rate(value, unit) : value;
}

function stallValue({ available, total }: Pick<Charger, "available" | "total">, lang?: string) {
  return {
    stalls: placesWordsFor(lang).stationRates.stalls(numberLine(available, lang), numberLine(total, lang)),
    tone: available === 0 ? ("bad" as const) : available < total / 2 ? ("warn" as const) : ("good" as const),
  };
}

export function stationRatesCopy<G extends Grade, C extends Charger>(
  input: Station<G, C>,
  state: StateName,
  currency?: AppCurrency,
  lang?: string,
) {
  const { stationRates: words } = placesWordsFor(lang);
  const source = input.headline ?? stationHeadline(input);
  const stall = source && "total" in source ? stallValue(source, lang) : undefined;
  const headline = stall
    ? { label: words.stallsLabel, value: stall.stalls, tone: stall.tone }
    : source && "grade" in source
      ? { label: source.grade.label, value: gradeValue(source.grade, currency, lang), tone: undefined }
      : undefined;
  const claimed = state === "success" || input.offer?.claimed;
  return {
    updated: input.updatedAt && words.updated(input.updatedAt),
    hasRates: !!source,
    headline,
    grades:
      input.detail === "brief"
        ? []
        : (input.grades ?? []).map((row) => ({ ...row, value: gradeValue(row, currency, lang) })),
    chargers:
      input.detail === "brief"
        ? []
        : (input.chargers ?? []).map((row) => ({
            ...row,
            power: words.power(numberLine(row.kw, lang)),
            ...stallValue(row, lang),
          })),
    offer: input.offer && words.cashback(input.offer.cashback),
    claimed: input.offer && claimed && state !== "success" ? words.success : undefined,
    claim: input.offer && !claimed ? words.claim : undefined,
    directions: Boolean(input.goto || input.distance || source || input.offer),
  };
}

export function stationRatesReading(
  input: Station<Grade, Charger>,
  state: StateName,
  currency?: AppCurrency,
  lang?: string,
): string[] {
  const { stationRates: words } = placesWordsFor(lang);
  if (state !== "filled" && state !== "success") return [];
  const board = stationRatesCopy(input, state, currency, lang);
  const rates =
    input.detail === "brief" && board.headline
      ? [words.reading(board.headline.label, board.headline.value)]
      : [
          ...board.grades.map(({ label, value }) => words.reading(label, value)),
          ...board.chargers.map(({ connector, power, stalls }) =>
            words.connectorReading(connector, power, stalls),
          ),
        ];
  return [
    JSON.stringify(input.name),
    input.brand,
    input.distance,
    board.updated,
    state === "success" ? words.success : undefined,
    ...rates,
    board.hasRates ? undefined : words.empty,
    board.offer,
    board.claimed,
    board.claim,
    board.directions ? words.directions : undefined,
  ].filter((line): line is string => Boolean(line));
}

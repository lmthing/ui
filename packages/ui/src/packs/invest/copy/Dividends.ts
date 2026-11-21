import {
  compactMoneyLine,
  dateLocaleOf,
  numberLine,
  placeholderTitle,
  type AppCurrency,
} from "../../../catalog";
import { investWordsFor } from "../lang";

export type DividendRow = {
  id: string;
  assetId: string;
  assetName?: string;
  entitledAt?: string;
  entitlement?: string;
  payOn: string;
  perUnit: number;
  withheld?: number;
  receivedAt?: string | undefined;
  entitledUnits?: number | null;
  gross?: number | null;
  net?: number | null;
  goto?: string | undefined;
  receive?: boolean | undefined;
  void?: boolean | undefined;
};

export function dividendCopy(row: DividendRow, lang?: string, currency?: AppCurrency) {
  const w = investWordsFor(lang).dividends;
  const date = new Intl.DateTimeFormat(dateLocaleOf(lang), {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const money = (value: number | null | undefined) =>
    typeof value === "number" && Number.isFinite(value) ? compactMoneyLine(value, currency, lang) : w.unknown;
  const asset =
    row.assetName ??
    (row.assetId === "item_1" ? placeholderTitle(0, lang) : row.assetId.replaceAll("_", " "));
  return {
    asset,
    status: row.receivedAt ? w.received(date.format(new Date(row.receivedAt))) : w.expected,
    pay_on: w.payOn(date.format(new Date(row.payOn))),
    entitled_at: w.entitledOn(date.format(new Date((row.entitlement ?? row.entitledAt)!))),
    per_unit: w.perUnit(money(row.perUnit)),
    units: w.units(row.entitledUnits == null ? w.unknown : numberLine(row.entitledUnits, lang)),
    gross: w.gross(money(row.gross)),
    withheld: w.withheld(money(row.withheld ?? 0)),
    net: money(row.net),
  };
}

export function dividendReading(
  {
    distributions,
    detail,
    receiptRecorded,
  }: {
    distributions: readonly DividendRow[];
    detail?: string;
    receiptRecorded?: boolean;
  },
  lang?: string,
  currency?: AppCurrency,
) {
  const w = investWordsFor(lang).dividends;
  return [
    ...(receiptRecorded ? [w.saved] : []),
    ...distributions.flatMap((row) => {
      const copy = dividendCopy(row, lang, currency);
      return [
        w.payReading(row.id, row.payOn),
        w.reading([
          row.id,
          copy.asset,
          copy.status,
          copy.pay_on,
          w.net,
          copy.net,
          ...(detail === "brief"
            ? []
            : [copy.entitled_at, copy.per_unit, copy.units, copy.gross, copy.withheld]),
        ]),
        ...(row.receive ? [w.receive] : []),
        ...(row.void ? [w.reverse] : []),
      ];
    }),
  ];
}

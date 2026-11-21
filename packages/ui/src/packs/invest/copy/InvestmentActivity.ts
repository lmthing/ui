import { compactMoneyLine, dateLocaleOf, numberLine, pluralForm, type AppCurrency } from "../../../catalog";
import { investWordsFor } from "../lang";

export type ActivityRow = {
  id: string;
  at: string;
  kind: keyof ReturnType<typeof investWordsFor>["activity"]["kinds"];
  assetId?: string | undefined;
  assetName?: string;
  units?: number | undefined;
  unitPrice?: number | undefined;
  fee?: number | undefined;
  amount?: number | undefined;
  movement?: number;
  voided?: boolean;
  goto?: string | undefined;
  void?: boolean | undefined;
};

export function activityMovement(row: ActivityRow) {
  if (row.movement !== undefined) return row.movement;
  const trade = (row.units ?? 0) * (row.unitPrice ?? 0);
  switch (row.kind) {
    case "buy":
      return -trade - (row.fee ?? 0);
    case "sell":
      return trade - (row.fee ?? 0);
    case "deposit":
      return row.amount ?? 0;
    case "fee":
    case "withdrawal":
      return -(row.amount ?? 0);
    case "dividend":
      return undefined;
  }
}

export function activityCopy(row: ActivityRow, lang?: string, currency?: AppCurrency) {
  const w = investWordsFor(lang).activity;
  const money = (amount: number) => compactMoneyLine(amount, currency, lang);
  const movement = activityMovement(row);
  const value = movement === undefined || !Number.isFinite(movement) ? w.unknown : money(movement);
  const asset = row.assetName ?? row.assetId?.replaceAll("_", " ");
  const event = w.kinds[row.kind];
  return {
    event: asset ? w.event(event, asset) : event,
    at: new Intl.DateTimeFormat(dateLocaleOf(lang), {
      timeZone: "UTC",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(row.at)),
    cash:
      typeof movement === "number" && Number.isFinite(movement) && movement > 0 ? w.positive(value) : value,
    units: row.units === undefined ? undefined : w.units(numberLine(row.units, lang)),
    unit_price: row.unitPrice === undefined ? undefined : w.unitPrice(money(row.unitPrice)),
    fee: row.kind === "buy" || row.kind === "sell" ? w.fee(money(row.fee ?? 0)) : undefined,
    status: row.voided ? w.voided : undefined,
    tone: row.voided ? "muted" : movement && movement > 0 ? "good" : "text",
  } as const;
}

export function activityCount(count: number, lang?: string) {
  return investWordsFor(lang).activity.earlier(numberLine(count, lang), pluralForm(count, lang) === "one");
}

export function activityReading(
  {
    entries,
    detail,
    linked,
    entryCount,
    corrected,
  }: {
    entries: readonly ActivityRow[];
    detail?: string;
    linked?: boolean;
    entryCount?: number;
    corrected?: boolean;
  },
  lang?: string,
  currency?: AppCurrency,
) {
  const w = investWordsFor(lang).activity;
  const hidden = (entryCount ?? entries.length) - entries.length;
  return [
    ...(corrected ? [w.corrected] : []),
    ...entries.flatMap((row) => {
      const { at, event, cash, status, units, unit_price, fee } = activityCopy(row, lang, currency);
      return [
        w.reading([row.id, event, at, cash, status, ...(detail === "brief" ? [] : [units, unit_price, fee])]),
        ...(row.void ? [w.void] : []),
      ];
    }),
    ...(hidden > 0 ? [activityCount(hidden, lang)] : []),
    ...(linked ? [w.add] : []),
  ];
}

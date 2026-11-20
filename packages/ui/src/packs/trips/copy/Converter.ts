import { z } from "zod";
import {
  appointmentDate,
  currencies,
  isoDate,
  localeOf,
  moneyLine,
  numberLine,
  type Currency,
  type DeviceData,
} from "../../../catalog";
import { tripsWordsFor } from "../lang";

export const converterMax = 999999999;
const currency = z.enum(currencies);
const exchangeRate = z
  .object({
    home: currency,
    local: currency,
    rate: z.number().positive(),
    date: isoDate,
  })
  .refine(
    ({ home, local, rate }) =>
      home !== local && Number.isFinite(converterMax / rate) && Number.isFinite(converterMax * rate),
  );
type ExchangeRate = z.output<typeof exchangeRate>;

/** A rate snapshot is in local units per home unit; it never enters Writer props. */
export function exchangeRateOf(data?: DeviceData): ExchangeRate | undefined {
  const result = exchangeRate.safeParse(data?.exchange_rates?.[0]);
  return result.success ? result.data : undefined;
}

/** The last edited amount is kept in its own currency, independent of display order. */
export type ConverterInput = { value?: number | undefined; edited?: "home" | "local"; swapped?: boolean };

export function converterAmounts(input: ConverterInput, rate?: ExchangeRate) {
  const { value, edited = "home", swapped = false } = input;
  const home = edited === "home" ? value : rate && value !== undefined ? value / rate.rate : undefined;
  const local = edited === "local" ? value : rate && value !== undefined ? value * rate.rate : undefined;
  const pair = {
    home: { side: "home", currency: rate?.home, value: home },
    local: { side: "local", currency: rate?.local, value: local },
  } as const;
  return swapped ? ([pair.local, pair.home] as const) : ([pair.home, pair.local] as const);
}

function currencyLine(value: number, currency: Currency, lang?: string): string {
  const options = new Intl.NumberFormat(localeOf(lang), { style: "currency", currency }).resolvedOptions();
  const amount = options.maximumFractionDigits === 0 ? Math.round(value) : value;
  return moneyLine(amount, currency, undefined, lang);
}

export function converterReading(input: ConverterInput, lang?: string, data?: DeviceData): string[] {
  const rate = exchangeRateOf(data);
  const { converter } = tripsWordsFor(lang);
  return [
    ...converterAmounts(input, rate).map(({ side, currency, value }) => {
      const label = converter[side];
      if (value === undefined) return label;
      const amount = currency ? currencyLine(value, currency, lang) : numberLine(value, lang);
      return converter.amount(label, amount);
    }),
    rate ? converter.rateDate(appointmentDate(rate.date, lang)) : converter.noRate,
    converter.swap,
  ];
}

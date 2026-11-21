import { z } from "zod";
import {
  appointmentDate,
  currencies,
  isoDate,
  localeOf,
  numberLine,
  type Currency,
  type DeviceData,
  type Meta,
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

type Linked = NonNullable<Meta["linkedEdits"]>;
type Side = "from" | "to";

function amountOf(text: string): number | undefined {
  // A lone separator is a draft, not a zero; commas are decimal separators, never grouping.
  const value = text.trim().replace(",", ".");
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)) return;
  const amount = Number(value);
  if (Number.isFinite(amount)) return amount;
}

function convertedText(value: number | undefined, fromHome: boolean, rate?: ExchangeRate): string {
  if (value === undefined || !rate) return "";
  const opposite = fromHome ? value * rate.rate : value / rate.rate;
  if (!Number.isFinite(opposite)) return "";
  const currency: Currency = fromHome ? rate.local : rate.home;
  const locale = localeOf();
  const { maximumFractionDigits = 2 } = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).resolvedOptions();
  return new Intl.NumberFormat(locale, { useGrouping: false, maximumFractionDigits }).format(opposite);
}

/** The shared runtime moves the exact edit to the opposite side when swapping. */
export const projectConverter = (
  props: Parameters<Linked["project"]>[0],
  { edit, swapped }: Parameters<Linked["project"]>[1],
  data: DeviceData,
) => {
  const rate = exchangeRateOf(data);
  const homePart: Side = swapped ? "to" : "from";
  const source = edit?.part === "from" || edit?.part === "to" ? edit.part : homePart;
  const seed = typeof props.value === "number" ? props.value : undefined;
  const text = edit?.text ?? (seed === undefined ? "" : numberLine(seed));
  const peer = convertedText(edit ? amountOf(text) : seed, source === homePart, rate);
  return {
    fromText: source === "from" ? text : peer,
    toText: source === "to" ? text : peer,
    source,
    edited: edit !== undefined,
    swapped,
    rate,
  };
};

export function converterDisplay(input: unknown, lang?: string) {
  const { fromText, toText, source, edited, swapped, rate, detail } = input as ReturnType<
    typeof projectConverter
  > & { detail?: string };
  const { converter } = tripsWordsFor(lang);
  // Keep text editable: use Latin digits, no grouping, and only localize a generated decimal separator.
  const locale = new Intl.NumberFormat(localeOf(lang), { numberingSystem: "latn" });
  const separator = locale.formatToParts(1.1).find(({ type }) => type === "decimal")?.value ?? ".";
  const field = (part: Side, text: string, home: boolean) => {
    const side = home ? "home" : "local";
    return {
      part,
      label: rate ? converter.currencyLabel(rate[side], converter[side]) : converter[side],
      text: edited && part === source ? text : text.replace(".", separator),
    };
  };
  return {
    fields: [field("from", fromText, !swapped), field("to", toText, swapped)],
    rateDate:
      detail === "brief"
        ? ""
        : rate
          ? converter.rateDate(appointmentDate(rate.date, lang))
          : converter.noRate,
  };
}

export function converterReading(input: unknown, lang?: string): string[] {
  const { converter } = tripsWordsFor(lang);
  const { fields, rateDate } = converterDisplay(input, lang);
  return [
    ...fields.map(({ label, text }) => (text ? converter.amount(label, text) : label)),
    converter.swap,
    ...(rateDate ? [rateDate] : []),
  ];
}

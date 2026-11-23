import { appointmentDate, isoDate, moneyLine, numberLine, type AppCurrency } from "../../../catalog";
import { hiringWordsFor, type HiringWords } from "../lang";
import type { payPeriods } from "../seeds";

type Details = {
  status: keyof HiringWords["offer"]["status"];
  pay: number;
  per: (typeof payPeriods)[number];
  hoursPerWeek: number;
  start: string;
  respondBy?: string | undefined;
  conditions: readonly string[];
};

/** A date-only offer stays open through the end of the local response day. */
export function responseCutoff(value: unknown) {
  const date = isoDate.safeParse(value);
  if (!date.success) return;
  const [year, month, day] = date.data.split("-").map(Number);
  const cutoff = new Date(0);
  cutoff.setFullYear(year!, month! - 1, day! + 1);
  cutoff.setHours(0, 0, 0, 0);
  return cutoff.getTime();
}

export function offerWindow(status: unknown) {
  return { draft: status === "draft", sent: status === "sent" };
}

export function offerCopy(input: Details, expired: boolean, currency?: AppCurrency, lang?: string) {
  const words = hiringWordsFor(lang).offer;
  return {
    pay: moneyLine(input.pay, currency, input.per, lang),
    hours: words.hours(numberLine(input.hoursPerWeek, lang)),
    start: words.start(appointmentDate(input.start, lang)),
    deadline: input.respondBy
      ? (expired ? words.closed : words.deadline)(appointmentDate(input.respondBy, lang))
      : undefined,
    conditions: input.conditions.map(words.condition),
    status: expired ? words.expired : words.status[input.status],
  };
}

export function offerReading(
  input: Details & { expired: boolean; arrange?: "rows" | "grid" | undefined },
  currency?: AppCurrency,
  lang?: string,
) {
  const words = hiringWordsFor(lang).offer;
  const copy = offerCopy(input, input.expired, currency, lang);
  const { draft, sent } = offerWindow(input.status);
  return [
    copy.status,
    copy.pay,
    ...(input.arrange === "grid"
      ? [copy.hours, copy.start]
      : [[copy.hours, copy.start].join(words.termSeparator)]),
    ...(copy.deadline ? [copy.deadline] : []),
    ...(copy.conditions.length ? [words.conditions, ...copy.conditions] : []),
    ...(draft ? [words.actions.send, words.actions.edit] : []),
    ...(sent && !input.expired ? [words.recipientActions, words.actions.accept, words.actions.decline] : []),
    ...(sent ? [words.employerActions, words.actions.withdraw] : []),
  ];
}

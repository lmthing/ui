import { appointmentDate, moneyLine, wordsFor, type AppCurrency } from "../../../catalog";
import { hiringWordsFor, type HiringWords } from "../lang";
import type { payPeriods } from "../seeds";

type Words = HiringWords["jobPost"];
type JobDetails = {
  workplace: keyof Words["workplace"];
  contract: keyof Words["contract"];
  pay?: { min: number; max: number; per: (typeof payPeriods)[number] } | undefined;
  closes?: string | undefined;
  requirements: readonly string[];
  benefits?: readonly string[] | undefined;
  easyApply?: boolean | undefined;
};

export function jobAcceptsApplications(closes: unknown, now = new Date()) {
  const today = `${String(now.getFullYear()).padStart(4, "0")}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return typeof closes !== "string" || closes >= today;
}

function payLine({ min, max, per }: NonNullable<JobDetails["pay"]>, currency?: AppCurrency, lang?: string) {
  if (min === max) return moneyLine(min, currency, per, lang);
  const words = hiringWordsFor(lang).jobPost;
  const shared = wordsFor(lang);
  const amount = (value: number) => moneyLine(value, currency, undefined, lang);
  return shared.perAmount(words.payRange(amount(min), amount(max)), shared.perWords[per]);
}

export function jobPostCopy(input: JobDetails, currency?: AppCurrency, lang?: string, now = new Date()) {
  const dictionary = hiringWordsFor(lang);
  const words = dictionary.jobPost;
  const open = jobAcceptsApplications(input.closes, now);
  return {
    workplace: words.workplace[input.workplace],
    contract: words.contract[input.contract],
    pay: input.pay ? payLine(input.pay, currency, lang) : undefined,
    requirements: input.requirements.map(words.requirement),
    benefits: input.benefits ?? [],
    benefitsLabel: words.benefits,
    easyApply: input.easyApply ? dictionary.jobFeed.easyApply : undefined,
    closes: input.closes
      ? (open ? words.closes : words.closed)(appointmentDate(input.closes, lang))
      : undefined,
    open,
  };
}

export function jobPostReading(input: JobDetails, currency?: AppCurrency, lang?: string) {
  const words = hiringWordsFor(lang).jobPost;
  const copy = jobPostCopy(input, currency, lang);
  return [
    [copy.workplace, copy.contract].join(words.termSeparator),
    ...(copy.pay === undefined ? [] : [copy.pay]),
    ...(copy.easyApply ? [copy.easyApply] : []),
    ...(copy.benefits.length ? [copy.benefitsLabel, ...copy.benefits] : []),
    words.requirements,
    ...copy.requirements,
    ...(copy.closes === undefined ? [] : [copy.closes]),
    words.save,
    ...(copy.open ? [words.apply] : []),
    words.publish,
  ];
}

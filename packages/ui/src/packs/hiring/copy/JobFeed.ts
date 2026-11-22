import {
  appointmentDate,
  moneyLine,
  numberLine,
  pluralForm,
  wordsFor,
  type AppCurrency,
} from "../../../catalog";
import { hiringWordsFor, type HiringWords } from "../lang";
import type { payPeriods } from "../seeds";

type Job = {
  workplace: keyof HiringWords["jobPost"]["workplace"];
  place?: string | undefined;
  posted?: string | undefined;
  pay?: { min: number; max: number; per: (typeof payPeriods)[number] } | undefined;
  easyApply: boolean;
  saved: boolean;
};
const dayMs = 86_400_000;

function postedLine(date: string, lang: string | undefined, now: Date) {
  const { jobFeed, applications } = hiringWordsFor(lang);
  const today = new Date(0);
  today.setUTCFullYear(now.getFullYear(), now.getMonth(), now.getDate());
  const age = (today.getTime() - Date.parse(`${date}T00:00:00Z`)) / dayMs;
  if (age < 0) return jobFeed.postedOn(appointmentDate(date, lang));
  if (age === 0) return jobFeed.postedToday;
  return jobFeed.postedAgo(applications.daysAgo(numberLine(age, lang), pluralForm(age, lang)));
}

function payLine({ min, max, per }: NonNullable<Job["pay"]>, currency?: AppCurrency, lang?: string) {
  if (min === max) return moneyLine(min, currency, per, lang);
  const format = (value: number) => moneyLine(value, currency, undefined, lang);
  const shared = wordsFor(lang);
  const range = hiringWordsFor(lang).jobPost.payRange(format(min), format(max));
  return shared.perAmount(range, shared.perWords[per]);
}

export function jobFeedCopy(job: Job, currency?: AppCurrency, lang?: string, now = new Date()) {
  const { jobFeed, jobPost } = hiringWordsFor(lang);
  return {
    workplace: jobPost.workplace[job.workplace],
    place: job.place,
    posted: job.posted && postedLine(job.posted, lang, now),
    pay: job.pay && payLine(job.pay, currency, lang),
    save: job.saved ? jobFeed.saved : jobFeed.save,
    easyApply: job.easyApply ? jobFeed.easyApply : undefined,
    apply: job.easyApply ? jobFeed.apply : undefined,
  };
}

export function jobFeedReading(rows: readonly Job[], currency?: AppCurrency, lang?: string) {
  return rows.flatMap((row) =>
    Object.values(jobFeedCopy(row, currency, lang)).filter((line) => line !== undefined),
  );
}

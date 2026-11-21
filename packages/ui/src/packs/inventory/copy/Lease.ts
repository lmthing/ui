import { appointmentDate, compactMoneyLine, moneyLine, numberLine, pluralForm } from "../../../catalog";
import { inventoryWordsFor } from "../lang";

type Terms = { start: string; end: string; per: "month" | "week"; due: number };
type Lease = Terms & {
  place: string;
  tenant: string;
  rent: number;
  deposit?: number | undefined;
  detail: "full" | "brief";
};

const msPerDay = 86_400_000;
const daysPerWeek = 7;
const renewalWindow = 45;

function monthlyDue(from: Date, due: number, monthOffset: number) {
  const year = from.getUTCFullYear();
  const month = from.getUTCMonth() + monthOffset;
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return Date.UTC(year, month, Math.min(due, last));
}

function dueOnOrAfter(from: number, { per, due }: Terms): number {
  const date = new Date(from);
  if (per === "month") {
    const current = monthlyDue(date, due, 0);
    return current >= from ? current : monthlyDue(date, due, 1);
  }
  // ISO weekdays start at 1 for Monday. Keep the full wire range by cycling every seven days.
  const offset = (due - date.getUTCDay() + daysPerWeek) % daysPerWeek;
  return from + offset * msPerDay;
}

export function leaseSchedule(terms: Terms, now = new Date()) {
  // Work in civil days on the device, independent of the number of hours across a DST change.
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const start = Date.parse(terms.start);
  const end = Date.parse(terms.end);
  const left = (end - today) / msPerDay;
  const next = dueOnOrAfter(Math.max(today, start), terms);
  return {
    daysLeft: Math.max(0, left),
    ratio: Math.min(1, Math.max(0, (end - today) / (end - start))),
    nextDue: next <= end ? new Date(next).toISOString().slice(0, 10) : undefined,
    status: left < 0 ? "ended" : left === 0 ? "endsToday" : left <= renewalWindow ? "soon" : undefined,
  } as const;
}

function leaseMoney(value: number, lang?: string) {
  return value < 1e7
    ? moneyLine(value, undefined, undefined, lang)
    : compactMoneyLine(value, undefined, lang);
}

export function leaseCopy(input: Lease, lang?: string, now = new Date()) {
  const words = inventoryWordsFor(lang).lease;
  const schedule = leaseSchedule(input, now);
  const full = input.detail === "full";
  return {
    tenant: words.tenant(input.tenant),
    start: full ? words.start(appointmentDate(input.start, lang)) : undefined,
    end: words.end(appointmentDate(input.end, lang)),
    remaining: words.remaining(numberLine(schedule.daysLeft, lang), pluralForm(schedule.daysLeft, lang)),
    ratio: schedule.ratio,
    rent: words.rent(leaseMoney(input.rent, lang), input.per),
    nextDue: schedule.nextDue ? words.nextDue(appointmentDate(schedule.nextDue, lang)) : words.noDue,
    deposit: full && input.deposit !== undefined ? words.deposit(leaseMoney(input.deposit, lang)) : undefined,
    renewal: schedule.status ? words.renewal[schedule.status] : undefined,
    renewalTone:
      schedule.status === "soon" || schedule.status === "endsToday" ? ("warn" as const) : ("muted" as const),
  };
}

export function leaseReading(input: Lease, lang?: string, now = new Date()): string[] {
  const words = inventoryWordsFor(lang).lease;
  const { tenant, start, end, remaining, renewal, rent, nextDue, deposit } = leaseCopy(input, lang, now);
  return [
    input.place,
    tenant,
    start,
    end,
    words.timeReading(remaining),
    renewal,
    rent.join(""),
    nextDue,
    deposit?.join(""),
  ].filter((line): line is string => line !== undefined);
}

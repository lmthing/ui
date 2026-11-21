import { appointmentDate, documentFieldLine, leftLine, timeOfDayLine } from "../../../catalog";
import { commerceWordsFor } from "../lang";

export function promoExpiry(ends: string | undefined, lang?: string, endsAt?: string): string | undefined {
  const date = ends && appointmentDate(ends, lang);
  const time = endsAt && timeOfDayLine(endsAt, lang);
  const stamp = date && time ? documentFieldLine(date, time, lang) : (date ?? time);
  return stamp && documentFieldLine(commerceWordsFor(lang).promoEnds, stamp, lang);
}

export const offerClock = {
  id: "offer",
  kind: "until",
  from: "ends",
  at: "endsAt",
  prop: "remainingMs",
  when: { has_deadline: true },
} as const;

export function offerRemaining(
  {
    ends,
    endsAt,
    remainingMs,
  }: { ends?: string | undefined; endsAt?: string | undefined; remainingMs?: number | undefined },
  lang?: string,
  now = Date.now(),
) {
  if (!ends) return;
  const ms = remainingMs ?? new Date(`${ends}T${endsAt ?? "00:00"}`).getTime() - now;
  return ms > 0 ? leftLine(ms, lang) : commerceWordsFor(lang).offerExpired;
}

import { digitsLine, numberLine, pluralForm } from "../format";
import { dateLocaleOf, defaultLang, localeOf, wordsFor } from "../lang";

/** A duration as a clock: "4:05", "21:00", "1:02:03". */
export function clockLine(seconds: number, lang?: string): string {
  const s = Math.max(0, Math.floor(seconds));
  const [h, m, r] = [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60];
  const two = (n: number) => digitsLine(n, 2, lang);
  return h > 0 ? `${numberLine(h, lang)}:${two(m)}:${two(r)}` : `${numberLine(m, lang)}:${two(r)}`;
}

export const { weekdayInitials, weekdayNames, timerLabels, repeatLabels, mediaLabels } = wordsFor();

export const durationLine = (minutes: number, lang?: string): string =>
  wordsFor(lang).duration(numberLine(minutes, lang));

export function streakLine(count: number, days: readonly boolean[], lang?: string): string[] {
  const words = wordsFor(lang);
  return [
    words.days(numberLine(count, lang), pluralForm(count, lang)),
    words.streakDone(words.weekdayShort.filter((_, index) => days[index])),
  ];
}

/** Time left until a moment, from milliseconds. */
export function leftLine(ms: number, lang?: string): string {
  const words = wordsFor(lang);
  if (ms <= 0) return words.passed;
  const minutes = Math.floor(ms / 60000);
  const days = Math.floor(minutes / 1440);
  if (days >= 1) return words.daysLeft(words.days(numberLine(days, lang), pluralForm(days, lang)));
  if (minutes >= 60) return words.hoursLeft(numberLine(Math.floor(minutes / 60), lang));
  return words.minutesLeft(numberLine(Math.max(1, minutes), lang));
}

export const repeatOptions = ["never", "daily", "weekdays", "weekly", "monthly", "yearly"] as const;
export const remainingLine = (seconds: number, lang?: string): string => `-${clockLine(seconds, lang)}`;

export function dateFormatter(lang?: string) {
  return new Intl.DateTimeFormat(dateLocaleOf(lang), {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Provider-local dates, independent of the viewer's timezone. */
export function appointmentDate(date: string, lang?: string): string {
  return dateFormatter(lang).format(new Date(`${date}T00:00:00Z`));
}

/** Format a stored local clock without changing its value or timezone. */
export function timeOfDayLine(time: string, lang?: string): string {
  const locale = localeOf(lang);
  const date = new Date(`2000-01-01T${time}:00Z`);
  return locale === defaultLang || !Number.isFinite(date.getTime())
    ? time
    : new Intl.DateTimeFormat(locale, {
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
        timeZone: "UTC",
      }).format(date);
}

import { appointmentDate, timeOfDayLine, wordsFor } from "../../../catalog";
import { placesWordsFor } from "../lang";

type Day = { from: string; to: string; closed: boolean };
type Notice = { date: string; text: string };
type Schedule = { days: readonly Day[]; special: readonly Notice[]; detail?: "full" | "brief" | undefined };

const weekLength = 7;
const minutesPerHour = 60;
const minutesPerDay = 24 * minutesPerHour;
const msPerMinute = 60_000;
const isoDateLength = 10;
const minutesOf = (time: string) => Number(time.slice(0, 2)) * minutesPerHour + Number(time.slice(3));
const weekdayIndex = (date: Date) => (date.getDay() + weekLength - 1) % weekLength;
const localDate = (now: Date) =>
  new Date(now.getTime() - now.getTimezoneOffset() * msPerMinute).toISOString().slice(0, isoDateLength);

function closingTime(days: Schedule["days"], today: number, now: number) {
  const day = days[today]!;
  const previous = days[(today + weekLength - 1) % weekLength]!;
  const end = minutesOf(day.to);
  const start = minutesOf(day.from);
  const endToday = end < start ? end + minutesPerDay : end;
  const closesToday = !day.closed && start <= now && now < endToday;
  const carriesOver = !previous.closed && previous.to < previous.from && now < minutesOf(previous.to);
  if (closesToday && (!carriesOver || endToday >= minutesOf(previous.to))) return day.to;
  if (carriesOver) return previous.to;
}

export function hoursCopy({ days, special, detail }: Schedule, now: Date, lang?: string) {
  const words = placesWordsFor(lang);
  const today = weekdayIndex(now);
  const { weekdayNames } = wordsFor(lang);
  const date = localDate(now);
  const currentNotices = special.filter((notice) => notice.date === date);
  const close = currentNotices.length
    ? undefined
    : closingTime(days, today, now.getHours() * minutesPerHour + now.getMinutes());
  return {
    today,
    todayLabel: words.hoursToday(weekdayNames[today]!),
    headline: currentNotices.length
      ? words.hoursSpecialToday
      : close
        ? words.hoursOpen(timeOfDayLine(close, lang))
        : words.hoursClosed,
    open: close !== undefined,
    currentNotices,
    days: days.map(({ from, to, closed }, index) => ({
      day: weekdayNames[index]!,
      from: timeOfDayLine(from, lang),
      to: timeOfDayLine(to, lang),
      closed,
    })),
    notices: (detail === "brief" ? [] : special.filter((notice) => notice.date !== date)).map((notice) => ({
      ...notice,
      dateLabel: appointmentDate(notice.date, lang),
    })),
  };
}

export function hoursReading(input: Schedule, now: Date, lang?: string): string[] {
  const words = placesWordsFor(lang);
  const copy = hoursCopy(input, now, lang);
  return [
    copy.headline,
    ...copy.currentNotices.map(({ date, text }) => words.hoursNoticeLine(date, text)),
    copy.todayLabel,
    ...copy.days.map(({ day, from, to, closed }) =>
      words.hoursDayLine(day, closed ? words.closed : words.placeHours(from, to)),
    ),
    ...(copy.notices.length ? [words.hoursSpecial] : []),
    ...copy.notices.map(({ date, text, dateLabel }) => words.hoursNoticeLine(date, text, dateLabel)),
  ];
}

import {
  appointmentDate,
  numberLine,
  pluralForm,
  timeOfDayLine,
  type StateName,
  type Values,
} from "../../../catalog";
import { bookingWordsFor } from "../lang";

export const rosterStatuses = ["booked", "checked_in", "no_show"] as const;
export const rosterLimit = 30;
type Status = (typeof rosterStatuses)[number];
type Attendee = { name: string; status: Status; paid?: boolean | undefined; photo?: string | undefined };
type Roster = {
  at: string;
  capacity: number;
  attendees: readonly Attendee[];
  waitlistCount?: number | undefined;
  detail?: "full" | "brief" | undefined;
};

export function rosterCounts(capacity: number, attendees: readonly Pick<Attendee, "status">[]) {
  const checkedIn = attendees.filter(({ status }) => status === "checked_in").length;
  const occupied = attendees.filter(({ status }) => status !== "no_show").length;
  const spaces = Math.max(0, capacity - occupied);
  return { checkedIn, spaces, canAdmit: spaces > 0 && attendees.length < rosterLimit };
}

export const rosterCheckable = (status: Status) => status !== "no_show";

export function rosterLive(input: Readonly<Values>) {
  const attendees = input.attendees as readonly (Attendee & { checked: boolean })[];
  return {
    attendees: attendees.map((row) =>
      rosterCheckable(row.status) ? { ...row, status: row.checked ? "checked_in" : "booked" } : row,
    ),
  };
}

export function rosterInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => Array.from(word)[0])
    .join("");
}

export function rosterFeedback(state: StateName, spaces: number, lang?: string) {
  const words = bookingWordsFor(lang).roster;
  return state === "success"
    ? words.success
    : state === "error"
      ? spaces
        ? words.error
        : words.full
      : undefined;
}

export function rosterReading(input: unknown, state: StateName, lang?: string): string[] {
  const { at, capacity, attendees, waitlistCount, detail } = input as Roster;
  const words = bookingWordsFor(lang).roster;
  const { checkedIn, spaces, canAdmit } = rosterCounts(capacity, attendees);
  const { attendance, spaces: open, waiting } = rosterSummary(checkedIn, spaces, waitlistCount, lang);
  const feedback = rosterFeedback(state, spaces, lang);
  return [
    ...(detail === "brief" ? [] : [rosterDate(at, lang)]),
    attendance,
    open,
    ...(waiting ? [waiting] : []),
    ...(feedback ? [feedback] : []),
    ...(attendees.some(({ status }) => rosterCheckable(status)) ? [words.here, words.noshow] : []),
    ...attendees.flatMap(({ name, status, paid, photo }) => [
      ...(photo ? [] : [rosterInitials(name)]),
      words.status[status],
      ...(rosterCheckable(status) ? [words.checkin(name), words.noShowFor(name)] : []),
      ...(detail === "brief" || paid === undefined ? [] : [paid ? words.paid : words.unpaid]),
    ]),
    ...(!attendees.length ? [words.empty] : []),
    ...(canAdmit ? [words.walkin, ...(waitlistCount ? [words.promote] : [])] : []),
  ];
}

export function rosterDate(at: string, lang?: string) {
  return bookingWordsFor(lang).roster.dateTime(
    appointmentDate(at.slice(0, 10), lang),
    timeOfDayLine(at.slice(11, 16), lang),
  );
}

export function rosterSummary(checkedIn: number, spaces: number, waiting?: number, lang?: string) {
  const { metric } = bookingWordsFor(lang).roster;
  const [attendance, open, queued] = rosterMetrics(checkedIn, spaces, waiting, lang);
  return {
    attendance: metric(attendance.count, attendance.label),
    spaces: metric(open.count, open.label),
    waiting: queued && metric(queued.count, queued.label),
  };
}

export function rosterMetrics(checkedIn: number, spaces: number, waiting?: number, lang?: string) {
  const words = bookingWordsFor(lang).roster;
  return [
    { part: "attendance", count: numberLine(checkedIn, lang), label: words.attendance },
    { part: "spaces", count: numberLine(spaces, lang), label: words.spaces(pluralForm(spaces, lang)) },
    waiting === undefined
      ? undefined
      : { part: "waiting", count: numberLine(waiting, lang), label: words.waiting },
  ] as const;
}

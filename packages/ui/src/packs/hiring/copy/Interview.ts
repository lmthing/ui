import { appointmentDate, localeOf, numberLine, timeOfDayLine } from "../../../catalog";
import { hiringWordsFor, type HiringWords } from "../lang";

type Words = HiringWords["interview"];
type InterviewDetails = {
  date: string;
  time: string;
  minutes: number;
  format: keyof Words["format"];
  status: keyof Words["status"];
  link?: string | undefined;
  interviewers: readonly string[];
  rescheduleGoto?: string | undefined;
  style?: "checklist" | undefined;
  prep?: readonly string[] | undefined;
};

export function interviewPrep({ style, prep }: Pick<InterviewDetails, "style" | "prep">) {
  return style === "checklist" ? prep : undefined;
}

export function interviewActions(status: unknown, hasLink: boolean) {
  return {
    open: status === "proposed" || status === "confirmed",
    joinable: status === "confirmed" && hasLink,
  };
}

export function interviewCopy(input: InterviewDetails, lang?: string, now = new Date()) {
  const words = hiringWordsFor(lang).interview;
  const end = new Date(`${input.date}T${input.time}:00Z`);
  end.setUTCMinutes(end.getUTCMinutes() + input.minutes);
  const stamp = end.toISOString();
  const finish = timeOfDayLine(stamp.slice(11, 16), lang);
  const [year, month, day] = input.date.split("-").map(Number);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const past = new Date(year!, month! - 1, day!) < today;
  return {
    date: appointmentDate(input.date, lang),
    time: words.timeRange(
      timeOfDayLine(input.time, lang),
      stamp.startsWith(input.date) ? finish : words.nextDay(finish),
    ),
    duration: words.duration(numberLine(input.minutes, lang)),
    status: words.status[input.status],
    format: words.format[input.format],
    interviewers: words.interviewers(new Intl.ListFormat(localeOf(lang)).format(input.interviewers)),
    past: past && interviewActions(input.status, false).open ? words.past : undefined,
    link: input.link && !interviewActions(input.status, true).joinable ? words.link : undefined,
  };
}

export function interviewReading(input: InterviewDetails, lang?: string) {
  const { actions, prep } = hiringWordsFor(lang).interview;
  const { open, joinable } = interviewActions(input.status, Boolean(input.link));
  const details = Object.values(interviewCopy(input, lang)).filter((line) => line !== undefined);
  const guide = interviewPrep(input);
  if (guide?.length) details.push(prep, ...guide);
  return open
    ? [
        ...details,
        actions.edit,
        actions.invite,
        actions.cancel,
        ...(joinable ? [actions.join] : []),
        ...(input.status === "confirmed" ? [actions.complete] : []),
        ...(input.rescheduleGoto ? [actions.reschedule] : []),
      ]
    : details;
}

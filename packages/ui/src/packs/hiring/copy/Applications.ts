import { appointmentDate, numberLine, pluralForm } from "../../../catalog";
import { hiringWordsFor, type HiringWords } from "../lang";

type ApplicationInfo = {
  stage: keyof HiringWords["stages"];
  outcome: keyof HiringWords["outcomes"];
  applied?: string | undefined;
  lastContact?: string | undefined;
  next?: string | undefined;
  nextAt?: string | undefined;
};
const dayMs = 86_400_000;
const localDay = (now: Date) => {
  const day = new Date(0);
  day.setUTCFullYear(now.getFullYear(), now.getMonth(), now.getDate());
  return day.getTime();
};
const elapsedDays = (date: string, now: Date) => (localDay(now) - Date.parse(`${date}T00:00:00Z`)) / dayMs;
const pending = (row: ApplicationInfo) => row.outcome === "active" && row.next !== undefined;

export function projectApplications<T extends ApplicationInfo>(rows: readonly T[], now = new Date()) {
  const urgency = (row: T) => {
    const days = pending(row) && row.nextAt ? elapsedDays(row.nextAt, now) : -1;
    return days < 0 ? -1 : days;
  };
  return [...rows]
    .sort((a, b) => urgency(b) - urgency(a))
    .map((row) => ({
      ...row,
      followUp: pending(row) ? ("pending" as const) : ("none" as const),
    }));
}

export function applicationCopy(row: ApplicationInfo, lang?: string, now = new Date()) {
  const { applications: words, stages, outcomes } = hiringWordsFor(lang);
  const days = row.lastContact ? elapsedDays(row.lastContact, now) : 0;
  const due = pending(row) && row.nextAt ? elapsedDays(row.nextAt, now) : -1;
  return {
    stage: stages[row.stage],
    outcome: row.outcome === "active" ? undefined : outcomes[row.outcome],
    applied: row.applied ? words.applied(appointmentDate(row.applied, lang)) : undefined,
    lastContact: row.lastContact
      ? words.contact(
          appointmentDate(row.lastContact, lang),
          days > 0 ? words.daysAgo(numberLine(days, lang), pluralForm(days, lang)) : undefined,
        )
      : undefined,
    nextAt: row.nextAt ? words.nextAt(appointmentDate(row.nextAt, lang)) : undefined,
    due: due === 0 ? words.dueToday : due > 0 ? words.overdue : undefined,
    withdraw: row.stage === "saved" ? words.remove : words.withdraw,
  };
}

export function applicationsReading(rows: readonly ApplicationInfo[], lang?: string) {
  const { applications: words } = hiringWordsFor(lang);
  return rows.flatMap((row) => {
    const { withdraw, ...copy } = applicationCopy(row, lang);
    return [
      ...Object.values(copy).filter((line) => line !== undefined),
      ...(pending(row) ? [words.log] : []),
      ...(row.outcome === "active" ? [withdraw] : []),
    ];
  });
}

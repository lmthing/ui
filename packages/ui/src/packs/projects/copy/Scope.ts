import { z } from "zod";
import {
  appointmentDate,
  isoDate,
  localeOf,
  numberLine,
  text,
  type DeviceData,
  type StateName,
  type Values,
} from "../../../catalog";
import { projectsWordsFor } from "../lang";
import { timeLogZone } from "./TimeLog-clock";

type Deliverable = {
  title: string;
  acceptance: string;
  due?: string | undefined;
  acceptedAt?: string | undefined;
};
type Scope<T> = {
  projectRef: string;
  revision: number;
  detail: "full" | "brief";
  style: "deliverables" | "baseline";
  deliverables: readonly T[];
  excluded: readonly string[];
};
const gate = z.object({ projectRef: text(32), requires: z.array(text(32)).min(1).max(6) });
const calendarDay = z.object({ projectRef: text(32), date: isoDate });

export function scopeCanRemove(row: Readonly<Values>, input: Readonly<Values>, data: DeviceData) {
  if (!Array.isArray(input.deliverables) || input.deliverables.length <= 1 || Number(input.revision) >= 99)
    return false;
  return !data.project_milestones?.some((record) => {
    const parsed = gate.safeParse(record);
    return (
      parsed.success &&
      parsed.data.projectRef === input.projectRef &&
      parsed.data.requires.some((ref) => ref === row.deliverableRef)
    );
  });
}

export function scopeLocalDate(now: number, data: DeviceData) {
  if (!Number.isFinite(now)) return;
  try {
    const format = new Intl.DateTimeFormat(localeOf(), {
      timeZone: timeLogZone(data),
      calendar: "iso8601",
      numberingSystem: "latn",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const date = format.formatToParts(now);
    const part = (key: Intl.DateTimeFormatPartTypes) => date.find(({ type }) => type === key)?.value;
    return `${part("year")?.padStart(4, "0")}-${part("month")}-${part("day")}`;
  } catch {
    return;
  }
}

function todayFor(project: string, data: DeviceData, now: number) {
  for (const record of data.project_calendar ?? []) {
    const result = calendarDay.safeParse(record);
    if (result.success && result.data.projectRef === project) return result.data.date;
  }
  return scopeLocalDate(now, data);
}

export function scopeCopy<T extends Deliverable>(
  input: Scope<T>,
  lang?: string,
  data: DeviceData = {},
  now = Date.now(),
) {
  const w = projectsWordsFor(lang).scope;
  const today = todayFor(input.projectRef, data, now);
  const accepted = input.deliverables.filter(({ acceptedAt }) => Boolean(acceptedAt)).length;
  return {
    revision: w.revision(numberLine(input.revision, lang)),
    count: w.count(numberLine(accepted, lang), numberLine(input.deliverables.length, lang)),
    complete: accepted > 0 && accepted === input.deliverables.length,
    excluded: input.style === "baseline" ? input.excluded : [],
    rows: input.deliverables.map((row) => {
      const overdue = !!(today && row.due && row.due < today && !row.acceptedAt);
      const date = row.due && input.detail === "full" && appointmentDate(row.due, lang);
      return {
        row,
        overdue,
        due: date ? (overdue ? w.overdue(date) : w.due(date)) : undefined,
        acceptedAt:
          row.acceptedAt && input.detail === "full"
            ? w.acceptedAt(appointmentDate(row.acceptedAt, lang))
            : undefined,
      };
    }),
  };
}

export function scopeReading(input: unknown, state: StateName, lang?: string, data?: DeviceData) {
  if (state !== "filled" && state !== "success") return [];
  const copy = scopeCopy(input as Scope<Deliverable & { id: string }>, lang, data);
  const w = projectsWordsFor(lang).scope;
  return [
    copy.revision,
    w.accepted(copy.count),
    copy.complete ? w.complete : w.acceptedLabel,
    ...copy.rows.map(({ row, due, acceptedAt }) =>
      [
        `${row.id}: ${row.title}`,
        row.acceptance,
        due ? `${due} (${row.due})` : undefined,
        acceptedAt ? `${acceptedAt} (${row.acceptedAt})` : undefined,
      ]
        .filter(Boolean)
        .join(w.separator),
    ),
    ...(copy.excluded.length ? [w.excluded, ...copy.excluded] : []),
  ];
}

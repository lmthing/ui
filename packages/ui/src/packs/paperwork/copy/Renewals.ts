import { appointmentDate, numberLine, pluralForm, wordsFor } from "../../../catalog";
import { paperworkWordsFor } from "../lang";

type Dates = {
  due: string;
  noticeBy?: string | undefined;
  completedOn?: string | undefined;
};
type Line = {
  part: "due" | "notice_by" | "completed_on" | "warning";
  line: string;
  tone: "muted" | "warn" | "bad" | "good";
};

const dayMs = 86_400_000;
const warningDays = 30;

export const actionDate = ({ due, noticeBy }: Dates) => noticeBy ?? due;

export function renewalDetails(row: Dates & { complete: boolean }, now: Date, lang?: string): Line[] {
  const words = paperworkWordsFor(lang).renewals;
  const lines: Line[] = [];
  if (row.noticeBy)
    lines.push({ part: "notice_by", line: words.notice(appointmentDate(row.noticeBy, lang)), tone: "muted" });
  lines.push({ part: "due", line: words.due(appointmentDate(row.due, lang)), tone: "muted" });
  if (row.complete) {
    const line = row.completedOn
      ? words.completed(appointmentDate(row.completedOn, lang))
      : words.completedUndated;
    return [...lines, { part: "completed_on", line, tone: "good" }];
  }
  const start = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const days = (Date.parse(actionDate(row)) - start) / dayMs;
  if (days > warningDays) return lines;
  const duration = wordsFor(lang).days(numberLine(days, lang), pluralForm(days, lang));
  const line = days < 0 ? words.overdue : days === 0 ? words.dueToday : words.dueIn(duration);
  return [...lines, { part: "warning", line, tone: days < 0 ? "bad" : "warn" }];
}

import { appointmentDate, numberLine, pluralForm } from "../../../catalog";
import { learningWordsFor } from "../lang";

const dayMs = 86_400_000;

/** Compare civil dates, including across daylight saving changes. */
export function assignmentToday(now = new Date()): string {
  const year = String(now.getFullYear()).padStart(4, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function assignmentDue(
  due: string,
  status: "todo" | "done" | "graded",
  lang?: string,
  today = assignmentToday(),
) {
  const words = learningWordsFor(lang).assignments;
  const date = appointmentDate(due, lang);
  const days = (Date.parse(`${due}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / dayMs;
  if (status === "graded") return words.dueOn(date);
  if (days < 0) return words.deadlinePassed(date);
  if (days === 0) return words.dueToday(date);
  return days <= 7 ? words.dueIn(numberLine(days, lang), pluralForm(days, lang), date) : words.dueOn(date);
}

/** Give each subject a consistent mark using the kit's non-status tones. */
export function assignmentSubjectTone(subject: string): "accent" | "muted" {
  const key = Array.from(subject.trim().normalize().toLowerCase());
  const hash = key.reduce((sum, char) => sum + char.codePointAt(0)!, 0);
  return hash % 2 === 0 ? "accent" : "muted";
}

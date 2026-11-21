import { z } from "zod";
import { appointmentDate, isoDate, text, type DeviceData, type StateName } from "../../../catalog";
import { projectsWordsFor } from "../lang";

const deliverable = z.object({
  projectRef: text(32),
  deliverableRef: text(32),
  title: text(32),
  acceptedAt: isoDate.optional(),
});
const calendarDate = z.object({ projectRef: text(32), date: isoDate });

type Gate = { title: string; due: string; requires: readonly string[]; goto?: string | undefined };
type Gates<T extends Gate = Gate> = {
  projectRef: string;
  gates: readonly T[];
  style: "rail" | "cards";
  detail: "full" | "brief";
};

function acceptanceFor(project: string, data?: DeviceData) {
  const records = new Map<string, z.output<typeof deliverable>>();
  for (const record of data?.project_deliverables ?? []) {
    const parsed = deliverable.safeParse(record);
    if (parsed.success && parsed.data.projectRef === project)
      records.set(parsed.data.deliverableRef, parsed.data);
  }
  return records;
}

function projectToday(project: string, now: Date, data?: DeviceData) {
  for (const record of data?.project_calendar ?? []) {
    const parsed = calendarDate.safeParse(record);
    if (parsed.success && parsed.data.projectRef === project) return parsed.data.date;
  }
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

/** Milestone completion follows accepted deliverables, never the date or a Writer-authored status. */
export function milestoneCopies<T extends Gate>(
  input: Gates<T>,
  data?: DeviceData,
  lang?: string,
  now = new Date(),
) {
  const records = acceptanceFor(input.projectRef, data);
  const { milestones: words } = projectsWordsFor(lang);
  const today = projectToday(input.projectRef, now, data);
  const titleOf = (ref: string) => records.get(ref)?.title ?? words.ref(ref);
  return [...input.gates]
    .sort((a, b) => a.due.localeCompare(b.due))
    .map((gate) => {
      const missing = gate.requires.filter((ref) => !records.get(ref)?.acceptedAt);
      const reachedAt = missing.length
        ? undefined
        : gate.requires
            .map((ref) => records.get(ref)!.acceptedAt!)
            .sort()
            .at(-1);
      const overdue = !reachedAt && gate.due < today;
      const date = appointmentDate(gate.due, lang);
      return {
        gate,
        due: overdue ? words.overdue(date) : words.due(date),
        reached: reachedAt && words.reached(appointmentDate(reachedAt, lang)),
        requires:
          input.style === "cards" && input.detail === "full"
            ? words.requires(gate.requires.map(titleOf))
            : undefined,
        missing: missing.length ? words.missing(missing.map(titleOf)) : undefined,
        overdue,
      };
    });
}

export function milestoneReading(input: unknown, state: StateName, lang?: string, data?: DeviceData) {
  if (state !== "filled" && state !== "success") return [];
  const { separator } = projectsWordsFor(lang).milestones;
  return milestoneCopies(input as Gates, data, lang).map(({ gate, due, reached, requires, missing }) =>
    [gate.title, due, reached, requires, missing].filter(Boolean).join(separator),
  );
}

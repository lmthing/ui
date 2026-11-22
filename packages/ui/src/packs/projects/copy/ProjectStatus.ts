import { z } from "zod";
import {
  appointmentDate,
  isoDate,
  numberLine,
  pluralForm,
  text,
  type DeviceData,
  type StateName,
} from "../../../catalog";
import { projectsWordsFor } from "../lang";
import { dayOf } from "../seeds";

const calendar = z.object({ projectRef: text(32), date: isoDate });
const tones = { on_track: "good", at_risk: "warn", blocked: "bad" } as const;
type Snapshot = {
  projectRef: string;
  headline: string;
  author?: string | undefined;
  postGoto?: string | undefined;
  status: keyof typeof tones;
  updatedAt: string;
  wins: string[];
  blockers: string[];
  nextMilestone?: { title: string; due: string } | undefined;
  detail: "full" | "brief";
};

function todayFor(projectRef: string, data: DeviceData | undefined, now: Date) {
  for (const row of data?.project_calendar ?? []) {
    const parsed = calendar.safeParse(row);
    if (parsed.success && parsed.data.projectRef === projectRef) return parsed.data.date;
  }
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export function projectStatusCopy(input: Snapshot, lang?: string, data?: DeviceData, now = new Date()) {
  const { projectStatus: w } = projectsWordsFor(lang);
  const milestone = input.nextMilestone;
  const days = milestone && dayOf(milestone.due) - dayOf(todayFor(input.projectRef, data, now));
  return {
    status: w.status[input.status],
    tone: tones[input.status],
    updated: appointmentDate(input.updatedAt, lang),
    wins: input.wins.map(w.bullet),
    blockers: input.blockers.map(w.bullet),
    milestoneTitle: milestone && w.milestoneTitle(milestone.title),
    milestoneDate: milestone && appointmentDate(milestone.due, lang),
    dueToday: days === 0,
    remaining:
      days === undefined || days < 0
        ? undefined
        : days === 0
          ? w.today
          : w.remaining(numberLine(days, lang), pluralForm(days, lang) === "one"),
  };
}

export function projectStatusReading(input: unknown, state: StateName, lang?: string, data?: DeviceData) {
  const { projectStatus: w } = projectsWordsFor(lang);
  if (state === "empty") return [w.empty];
  if (state !== "filled") return [];
  const snapshot = input as Snapshot;
  const copy = projectStatusCopy(snapshot, lang, data);
  const full = snapshot.detail === "full";
  return [
    [copy.status, snapshot.headline, copy.updated, full && snapshot.author].filter(Boolean).join(w.separator),
    full && copy.wins.length > 0 && w.group(w.wins, copy.wins),
    full && copy.blockers.length > 0 && w.group(w.blockers, copy.blockers),
    full &&
      copy.milestoneTitle &&
      [copy.milestoneTitle, copy.milestoneDate, copy.remaining].filter(Boolean).join(w.separator),
    full && snapshot.postGoto && w.update,
  ].filter((line): line is string => Boolean(line));
}

import { createMeta, composeProbes } from "../recipe";
import type { ArchetypeMeta } from "../recipe";
const timelineHint = [
  "Use only the supplied dated events and calendar month/start/days/selected values. Mark their event dates. Timeline uses day style with supplied times and titles, and the date and detail in meta. On EVERY Timeline item end, tone and goto must be literal null, even when time and title have values; do not replace those nulls with end times, status tones or links. This is not hours style. Header action is null.",
];
export const meta = createMeta(
  "calendar",
  "Things by date",
  { week: "Header Calendar:week Timeline", month: "Header Calendar:month Timeline" },
  {
    week: [
      ...timelineHint,
      'Use "Appointments this week" for the Header title and the actual date span and appointment count in its subtitle, e.g. "Nov 18–20 · 2 appointments". Give each marked appointment day tone good so the dates with an agenda stand out.',
      'List the appointments in date and time order, retaining their names and times. Put a readable date first and the supplied purpose second in each meta, e.g. "Nov 18 · Routine review". This is an agenda: done is null.',
      "The subtitle and every event's date and purpose must stay visible. Emit literal null for Header.density, Header.emphasis, Header.detail, Timeline.density and Timeline.detail.",
    ],
    month: [
      ...timelineHint,
      'Use "Monthly appointments" for the Header title. In its subtitle, name the selected date and count its supplied appointments, e.g. "Nov 18 agenda below · 1 appointment". This connects the marked month overview to the selected day’s agenda directly below it. Do not promise that tapping a date loads a new agenda. Keep all Header axes null.',
      'Mark the supplied appointment dates with tone good. The Timeline is only the agenda for the supplied selected day: exclude every other day even when marked on the Calendar. Retain each title and time, put a readable date first and purpose second in meta (e.g. "Nov 18 · Routine review"), and leave done and all Timeline axes null.',
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

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
      'Use "Monthly appointments" for Header.title and name the selected date and count in Header.sub, e.g. "Nov 18 agenda below · 1 appointment". The subtitle must be visible: write literal null for Header.detail, Header.emphasis and Header.density. Do not use detail "brief" because it suppresses the subtitle. Do not promise that tapping a date loads a new agenda.',
      'Name the Calendar instance month_calendar and the following Timeline selected_day_agenda. Mark the supplied appointment dates with tone good. The Timeline lists only the supplied selected day’s appointments; keep their titles and times and put the readable date and purpose in meta (e.g. "Nov 18 · Routine review"). Keep Timeline.detail, Timeline.density and every item’s done null.',
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

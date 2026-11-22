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
      'Lead with a Header naming the week’s agenda, e.g. "Appointments this week". In its subtitle give the span from first to last event and the event count, e.g. "Nov 18–20 · 2 appointments". Next show the week Calendar under its supplied month and year, with tone good on event dates.',
      'Below the Calendar, list all the supplied events for that week in date and time order. Keep the names and times, then put the readable date and supplied purpose in each meta, e.g. "Nov 18 · Routine review". This is an agenda: done is null.',
      "The subtitle and every event's date and purpose must stay visible. Emit literal null for Header.density, Header.emphasis, Header.detail, Timeline.density and Timeline.detail.",
    ],
    month: [
      ...timelineHint,
      'Lead with the month overview, e.g. Header.title "Monthly appointments". In the visible Header.sub explicitly scope the agenda below to the selected date and its count, e.g. "Nov 18 agenda below · 1 appointment". Use literal null for Header.detail, Header.emphasis and Header.density; "brief" hides the subtitle.',
      "Show the full Calendar next with the supplied month and year and tone good on every supplied event date, even outside the selected day. In the following Timeline, list only the selected day’s events, in time order, with readable dates and supplied purposes in meta. Do not promise that tapping another date refreshes this agenda. Keep Timeline.detail, Timeline.density and every item’s done null.",
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

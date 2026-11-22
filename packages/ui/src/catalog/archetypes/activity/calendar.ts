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
      "The subtitle and every event's date and purpose must stay visible. Emit literal null for Header.emphasis, Header.detail and Timeline.detail.",
    ],
    month: [
      ...timelineHint,
      'Use the same specific title for the screen and Header, naming what is scheduled and in which month, e.g. "November appointments". In Header.sub, explain the calendar dots and name the selected date and its event count, e.g. "Event dots · Nov 18: 1 appointment". Use literal null for Header.detail and Header.emphasis so the subtitle stays visible.',
      'Then show the full Calendar as month_calendar with the supplied month and year, its selected date, and tone good on every supplied event date. Follow it with selected_day_agenda, a Timeline of only that date’s events in time order. Use short month-and-day dates, not ISO dates, before each supplied purpose in meta, e.g. "Nov 18 · Routine review". Do not promise that tapping another date refreshes the agenda. Keep Timeline.detail and every item’s done null.',
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

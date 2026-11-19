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
      "Give the week a recognizable date in the Header and say what is scheduled. Arrange the supplied events in date and time order. Keep each item's supplied purpose or detail beside its date and time so the agenda says what each event is for.",
    ],
    month: [
      ...timelineHint,
      "Make a focused appointments view: Header title names the supplied month and appointments, not Things; its sub explicitly names the selected date. Calendar marks all supplied appointment dates. The Timeline below it contains only that selected date's appointments, using their actual title, time, date and detail; it must not mix appointments from other dates into that selected-day detail.",
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

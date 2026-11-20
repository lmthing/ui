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
      "Connect the month picker to the agenda: Header.title names the month and appointments. Header.sub names the selected date in friendly words and tells the person to pick a date to see appointments (for example, “18 Nov · Pick a date to see visits”). Keep the subtitle within 40 characters and do not expose the raw ISO date.",
      "Calendar marks every supplied appointment date. Timeline lists only the selected date’s appointments, preserving the actual titles, times and details. Include the human-readable date and purpose in each item’s meta, e.g. “18 Nov · Routine review”. Leave Timeline density and detail null so the purpose remains visible. Do not add an unrelated navigation action.",
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

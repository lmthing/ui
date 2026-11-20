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
      "Use a short month-specific title such as “November appointments” in both title and Header.title. Use Header.sub as a compact guide to the whole screen: count the month's supplied visits, say which dates to tap, and identify the selected day's agenda. Example: “3 visits · Tap dots · Nov 18 agenda” (at most 40 characters). Use the actual count and date.",
      "Dots guide the person to visits: mark each supplied appointment date with tone good and leave other dates unmarked. Keep the supplied selection. The Timeline is that date’s agenda, not a second month list: show only its actual appointments in time order, with their exact titles and times. Put the purpose first and the friendly date second in meta, e.g. “Routine review · Nov 18”. Leave Timeline density and detail null.",
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

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
      'Name the task in Header.title, e.g. "Weekly agenda". Use Header.sub to state when the named visits happen, e.g. "Nov 2026 · Check-in & Follow-up" (40 characters max). Leave all Header and Timeline axes null. List the supplied events in date and time order; open each meta with the recognizable date, then the supplied purpose. This is an agenda, not a checklist, so done is null.',
    ],
    month: [
      ...timelineHint,
      "Name the displayed month and purpose in Header.title. Header.sub names the selected day's agenda and tells the person where to tap in at most 40 characters, e.g. “Nov 18 agenda · Tap marked dates”. Use the real selected date and leave all Header axes null.",
      "Dots guide the person to visits: mark each supplied appointment date with tone good. Keep the supplied selection. The Timeline is that selected day's agenda: exclude every appointment on a different date, even when marked on the Calendar. Copy selected-day titles and times and put the purpose first and date second in meta. Leave Timeline density and detail null.",
    ],
  },
) satisfies ArchetypeMeta;
export const defaults = meta.defaults;
export const probes = composeProbes(meta);

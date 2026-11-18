import type { CastLike } from "@lmthing/ui/catalog";
import { compositionScaleCast } from "./compose-scale-cast";
const journalCast: CastLike = {
  things: [{ type: "journal_entry", fields: ["title", "date", "summary"] }],
  items: [
    {
      id: "entry_today",
      type: "journal_entry",
      sample: true,
      title: "Daily check-in",
      date: "2026-11-18",
      summary: "Felt steadier after a short break.",
    },
    {
      id: "entry_yesterday",
      type: "journal_entry",
      sample: true,
      title: "Evening reflection",
      date: "2026-11-17",
      summary: "Rest helped after a busy day.",
    },
  ],
};
const items: CastLike["items"] = [
  {
    id: "check_in",
    type: "event",
    sample: true,
    title: "Check-in",
    date: "2026-11-18",
    time: "09:00",
    detail: "Routine review",
    month: "Nov 2026",
    start: 7,
    days: 30,
    selected: 18,
  },
  {
    id: "follow_up",
    type: "event",
    sample: true,
    title: "Follow-up",
    date: "2026-11-20",
    time: "14:30",
    detail: "Review next steps",
  },
  {
    id: "planning",
    type: "event",
    sample: true,
    title: "Planning",
    date: "2026-11-23",
    time: "10:00",
    detail: "Plan the coming week",
  },
];
const calendarCast: CastLike = {
  things: [
    { type: "event", fields: ["title", "date", "time", "detail", "month", "start", "days", "selected"] },
  ],
  items,
};
/** Date-based probes use the original dated observations. */
export function compositionHistoryCast(id: string, layout: string): CastLike {
  if (id === "journal" && layout === "entries") return structuredClone(journalCast);
  if (id !== "calendar") return compositionScaleCast(id, layout);
  const cast = structuredClone(calendarCast);
  return layout === "week" ? { ...cast, items: cast.items.slice(0, 2) } : cast;
}

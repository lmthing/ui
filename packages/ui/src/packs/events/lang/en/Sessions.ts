export const words = {
  sessions: {
    track: "Filter by track",
    allTracks: "All tracks",
    namedTrack: (label: string) => `Track: ${label}`,
    agenda: "My agenda",
    updated: "Agenda updated",
    noBookmarks: "No bookmarked sessions yet",
    noSessions: "No sessions in this view",
    conflict: "Time conflict",
    full: "Full",
    remaining: (count: string) => `${count} left`,
    capacity: (count: string, singular: boolean) => `${count} ${singular ? "seat" : "seats"}`,
    range: (start: string, end: string) => `${start}–${end}`,
    line: (fields: readonly (string | undefined)[]) => fields.filter(Boolean).join(" · "),
    save: (title: string) => `Bookmark ${title}`,
    unsave: (title: string) => `Remove ${title} from my agenda`,
  },
};

export type PropertyWords = typeof en;

export const en = {
  viewings: {
    statuses: {
      proposed: "Proposed",
      confirmed: "Confirmed",
      attended: "Attended",
      no_show: "No-show",
      cancelled: "Cancelled",
    },
    actions: { edit: "Edit", confirm: "Confirm", cancel: "Cancel", invite: "Invite" },
    outcome: "Record attendance",
    past: "Past viewing",
    empty: "No viewings yet",
    success: "Viewing updated",
    error: "Couldn’t update the viewing",
    start: (date: string, time: string) => `${date} · ${time}`,
    end: (time: string, duration: string) => `Ends ${time} · ${duration}`,
    nextDay: (date: string, time: string) => `${date} ${time}`,
  },
};

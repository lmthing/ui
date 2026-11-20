export const en = {
  meters: {
    register: "Utility meters",
    history: "Reading history",
    add: "Add reading",
    saved: "Reading saved",
    error: "Reading not saved",
    errorDetail: "Check the date and value.",
    noReadings: "No readings yet",
    photo: "View reading photo",
    units: { kWh: "kWh", m3: "m³", litre: "L" },
    amount: (number: string, unit: string) => `${number}\u00a0${unit}`,
    latest: (value: string) => `Latest · ${value}`,
    previous: (value: string) => `Previous · ${value}`,
    usage: (value: string, elapsed: string) => `${value} used · ${elapsed}`,
    dateTime: (date: string, time: string) => `${date} · ${time}`,
  },
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

export type PropertyWords = typeof en;

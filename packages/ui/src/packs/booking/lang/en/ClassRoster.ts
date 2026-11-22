import type { LDMLPluralRule } from "../../../../catalog";

export const words = {
  roster: {
    status: { booked: "Booked", checked_in: "Checked in", no_show: "No-show" },
    paid: "Paid",
    unpaid: "Unpaid",
    walkin: "Add walk-in",
    promote: "Promote next",
    here: "Here",
    noshow: "No-show",
    checkin: (name: string) => `Check-in for ${name}`,
    noShowFor: (name: string) => `Mark ${name} as a no-show`,
    attendance: "checked in",
    spaces: (form: LDMLPluralRule) => `${form === "one" ? "spot" : "spots"} left`,
    waiting: "waiting",
    metric: (count: string, label: string) => `${count} ${label}`,
    dateTime: (date: string, time: string) => `${date} · ${time}`,
    empty: "No attendees yet",
    success: "Attendance updated",
    full: "Class is full",
    error: "Couldn’t save attendance",
  },
};

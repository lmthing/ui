import type { LDMLPluralRule } from "../../../catalog";

export const en = {
  queuePeople: (count: string, form: LDMLPluralRule) =>
    `${count} ${form === "one" ? "person" : "people"} ahead`,
  queueCompact: (count: string) => `${count} ahead`,
  queuePosition: (label: string, position: string) => `${label}: ${position}`,
  quadrillion: (count: string) => `${count}Q`,
  slotTomorrow: " next day",
  anyoneLabel: "Anyone",
  appointmentLabels: {
    reschedule: "Reschedule",
    edit: "Edit details",
    booked: "Booked",
    confirmed: "Confirmed",
    pending: "Pending",
    cancelled: "Cancelled",
    done: "Done",
  },
  availabilityLabels: { from: "From", to: "To", break: "Break" },
  bookLabel: "Book",
  queueLabels: {
    waiting: "Waiting for a place",
    joined: "You're on the waitlist",
    position: "Your place in line",
    join: "Join waitlist",
    leave: "Leave waitlist",
  },
  slotLabels: { free: "free", taken: "taken", empty: "No free times" },
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

export type BookingWords = typeof en;

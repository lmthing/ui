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
};

export type BookingWords = typeof en;

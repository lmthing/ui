import type { LDMLPluralRule } from "../../../catalog";

export const en = {
  signed: (date: string) => `Signed · ${date}`,
  since: (date: string) => `Client since ${date}`,
  next: (text: string) => `Next: ${text}`,
  received: (amount: string) => `Received ${amount}`,
  paymentDate: (date: string) => `Date ${date}`,
  paymentDue: (date: string) => `Due ${date}`,
  reviews: (count: string, form: LDMLPluralRule) => `${count} ${form === "one" ? "review" : "reviews"}`,
  stars: (count: string, form: LDMLPluralRule) => `${count} ${form === "one" ? "star" : "stars"}`,
  agreementLabels: { agree: "I agree", accepted: "Accepted", name: "Full name" },
  contactLabels: { call: "Call", message: "Message", directions: "Directions" },
  paymentLabels: {
    paid: "Paid",
    due: "Due",
    overdue: "Overdue",
    partial: "Part paid",
    mark: "Mark as paid",
    remind: "Remind",
    updated: "Update complete",
  },
  reviewLabels: { reply: "Reply", response: "Business reply" },
  followUpLabels: {
    quote: "Quote",
    invoice: "Invoice",
    checkin: "Check-in",
    renewal: "Renewal",
    overdue: "Overdue",
    today: "Due today",
    upcoming: "Upcoming",
    done: "Done",
    snooze: "Snooze",
    remind: "Remind",
    success: "Follow-up updated",
    error: "Reminder wasn’t sent",
  },
};

export type CustomersWords = typeof en;

import type { LDMLPluralRule } from "../../../../catalog";

export const words = {
  queuePeople: (count: string, form: LDMLPluralRule) =>
    `${count} ${form === "one" ? "person" : "people"} ahead`,
  queueCompact: (count: string) => `${count} ahead`,
  queueTotal: (count: string, form: LDMLPluralRule) =>
    `${count} ${form === "one" ? "person" : "people"} on the list`,
  queuePosition: (label: string, position: string) => `${label}: ${position}`,
  queueRespondBy: (deadline: string) => `Respond by ${deadline}`,
  quadrillion: (count: string) => `${count}Q`,
  queueLabels: {
    waiting: "Waitlist",
    joined: "You're on the waitlist",
    position: "Your place in line",
    join: "Join waitlist",
    leave: "Leave waitlist",
    available: "A spot is available",
    review: "Review spot",
  },
};

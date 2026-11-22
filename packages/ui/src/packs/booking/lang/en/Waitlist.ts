import type { LDMLPluralRule } from "../../../../catalog";

export const words = {
  queuePeople: (count: string, form: LDMLPluralRule) =>
    `${count} ${form === "one" ? "person" : "people"} ahead`,
  queueCompact: (count: string) => `${count} ahead`,
  queuePosition: (label: string, position: string) => `${label}: ${position}`,
  quadrillion: (count: string) => `${count}Q`,
  queueLabels: {
    waiting: "Waitlist",
    joined: "You're on the waitlist",
    position: "Your place in line",
    join: "Join waitlist",
    leave: "Leave waitlist",
  },
};

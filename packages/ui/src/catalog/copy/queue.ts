export const queueLabels = {
  waiting: "Waiting for a place",
  joined: "You're on the waitlist",
  position: "Your place in line",
  join: "Join waitlist",
  leave: "Leave waitlist",
} as const;

export function queueAhead(ahead: number): string {
  return `${ahead} ${ahead === 1 ? "person" : "people"} ahead`;
}

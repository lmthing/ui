export const queueLabels = {
  waiting: "Waiting for a place",
  joined: "You're on the waitlist",
  position: "Your place in line",
  join: "Join waitlist",
  leave: "Leave waitlist",
} as const;

const queuePeopleLine = (ahead: number): string => `${ahead} ${ahead === 1 ? "person" : "people"} ahead`;

export function queueAhead(ahead: number): string {
  return ahead > 999 ? `${queueCount(ahead)} ahead` : queuePeopleLine(ahead);
}

export function queueCount(count: number): string {
  const quadrillion = count >= 1e15;
  return count > 999
    ? new Intl.NumberFormat("en", { notation: "compact", maximumSignificantDigits: 3 }).format(
        quadrillion ? count / 1e15 : count,
      ) + (quadrillion ? "Q" : "")
    : String(count);
}

export function queueExact(ahead: number, position?: number): string {
  return [position !== undefined ? `${queueLabels.position}: ${position}` : "", queuePeopleLine(ahead)]
    .filter(Boolean)
    .join("; ");
}

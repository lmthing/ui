import { appointmentDate } from "../../../catalog";

export const contactLabels = { call: "Call", message: "Message", directions: "Directions" } as const;
export const sinceLine = (date: string): string => `Client since ${appointmentDate(date)}`;
export const nextLine = (next: string): string => `Next: ${next}`;
export const tagsLine = (tags: readonly string[]): string => tags.join(" · ");

export function clientReading({
  since,
  next,
  tags,
  phone,
  address,
}: {
  since?: string | undefined;
  next?: string | undefined;
  tags: readonly string[];
  phone: boolean;
  address: boolean;
}): string[] {
  return [
    ...(since ? [sinceLine(since)] : []),
    ...(next ? [nextLine(next)] : []),
    ...(tags.length ? [tagsLine(tags)] : []),
    contactLabels.message,
    ...(phone ? [contactLabels.call] : []),
    ...(address ? [contactLabels.directions] : []),
  ];
}

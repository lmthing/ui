import { appointmentDate, cancelLabel, compactMoneyLine, durationLine } from "../../../catalog";

export const appointmentLabels = {
  reschedule: "Reschedule",
  edit: "Edit details",
  booked: "Booked",
  confirmed: "Confirmed",
  pending: "Pending",
  cancelled: "Cancelled",
  done: "Done",
} as const;

/** Optional record details, in the same order on screen and in an agent's reading. */
export function appointmentDetails(input: {
  with?: string | undefined;
  minutes: number;
  place?: string | undefined;
  price?: number | undefined;
  policy?: string | undefined;
}) {
  return Object.entries({
    with: input.with,
    minutes: durationLine(input.minutes),
    place: input.place,
    price: input.price !== undefined ? compactMoneyLine(input.price) : undefined,
    policy: input.policy,
  }).flatMap(([part, text]) => (text ? [{ part, text }] : []));
}

export function appointmentReading(
  input: Parameters<typeof appointmentDetails>[0] & {
    date: string;
    time: string;
    style: "card" | "summary";
    status: keyof typeof appointmentLabels;
  },
): string[] {
  return [
    appointmentDate(input.date),
    input.date,
    input.time,
    ...appointmentDetails(input).map((line) => line.text),
    ...(input.price !== undefined ? [String(input.price)] : []),
    ...(input.style === "card"
      ? [appointmentLabels[input.status], appointmentLabels.reschedule, cancelLabel]
      : [appointmentLabels.edit]),
  ];
}

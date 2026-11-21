import { appointmentDate, timeOfDayLine } from "../../../catalog";
import { teamWordsFor, type TeamWords } from "../lang";

type Schedule = { date: string; from: string; to: string };
type Status = keyof TeamWords["shiftStatus"];
type Details = {
  detail?: "full" | "brief";
  place?: string | undefined;
  role?: string | undefined;
  with?: string | undefined;
};

export function shiftSchedule(input: Schedule, lang?: string) {
  const { shiftTimeSeparator } = teamWordsFor(lang);
  const date = appointmentDate(input.date, lang);
  const from = timeOfDayLine(input.from, lang);
  const to = timeOfDayLine(input.to, lang);
  return { date, from, to, range: `${from}${shiftTimeSeparator}${to}` };
}

export function shiftDetails(input: Details, lang?: string) {
  const { shiftCoworkers } = teamWordsFor(lang);
  const secondary = input.detail !== "brief";
  const details = Object.entries({
    role: input.role,
    place: secondary ? input.place : undefined,
  }).flatMap(([part, text]) => (text ? [{ part, text, prefix: "" }] : []));
  if (secondary && input.with) {
    const [prefix, text] = shiftCoworkers(input.with);
    details.push({ part: "with", prefix, text });
  }
  return details;
}

export function shiftActionFlags(status: Status) {
  return { canSwap: status !== "swap_requested", canOffer: status !== "offered" };
}

export function shiftActionLabels(status: Status, lang?: string) {
  const { shiftActions } = teamWordsFor(lang);
  const { canSwap, canOffer } = shiftActionFlags(status);
  return {
    swap: canSwap ? shiftActions.swap : shiftActions.swapPending,
    offer: canOffer ? shiftActions.offer : shiftActions.offerPending,
  };
}

export function shiftReading(input: Schedule & Details & { status: Status }, lang?: string): string[] {
  const { shiftStatus } = teamWordsFor(lang);
  const { date, range } = shiftSchedule(input, lang);
  const { swap, offer } = shiftActionLabels(input.status, lang);
  return [
    range,
    date,
    shiftStatus[input.status],
    ...shiftDetails(input, lang).map(({ prefix, text }) => `${prefix}${JSON.stringify(text)}`),
    swap,
    offer,
  ];
}

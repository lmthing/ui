import { appointmentDate, numberLine, type StateName } from "../../../catalog";
import { eventsWordsFor } from "../lang";

export const rsvpNoteMax = 200;
type Reply = {
  date: string;
  answer: "none" | "yes" | "no";
  plusMax: number;
  companions?: number;
  meals: readonly string[];
  detail?: "full" | "brief" | undefined;
};

export function rsvpFields(
  { date, plusMax }: Pick<Reply, "date" | "plusMax">,
  companions: number,
  lang?: string,
) {
  const count = Number.isInteger(companions) && companions >= 0 && companions <= plusMax ? companions : 0;
  return { date: appointmentDate(date, lang), count: numberLine(count, lang) };
}

export function rsvpOptions({ answer, plusMax, meals }: Pick<Reply, "answer" | "plusMax" | "meals">) {
  return { allowsPlus: answer !== "no" && plusMax > 0, allowsMeals: answer !== "no" && meals.length > 0 };
}

export function rsvpReading(input: Reply, state: StateName, lang?: string): string[] {
  const { rsvp } = eventsWordsFor(lang);
  if (state !== "filled" && state !== "success") return [];
  const { date } = rsvpFields(input, input.companions ?? 0, lang);
  if (state === "success") return [rsvp.sent, date];
  const { allowsPlus, allowsMeals } = rsvpOptions(input);
  return [
    date,
    rsvp[input.answer],
    rsvp.yes,
    rsvp.no,
    ...(allowsPlus ? [rsvp.plus] : []),
    ...(allowsMeals ? [rsvp.meal] : []),
    ...(input.detail !== "brief" ? [rsvp.note] : []),
    rsvp.send,
  ];
}

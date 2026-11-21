import { appointmentDate, numberLine, pluralForm, timeOfDayLine } from "../../../catalog";
import { bookingWordsFor } from "../lang";

export function rosterDate(at: string, lang?: string) {
  return bookingWordsFor(lang).roster.dateTime(
    appointmentDate(at.slice(0, 10), lang),
    timeOfDayLine(at.slice(11, 16), lang),
  );
}

export function rosterSummary(checkedIn: number, spaces: number, waiting?: number, lang?: string) {
  const words = bookingWordsFor(lang).roster;
  return {
    attendance: words.attendance(numberLine(checkedIn, lang)),
    spaces: words.spaces(numberLine(spaces, lang), pluralForm(spaces, lang)),
    waiting: waiting === undefined ? undefined : words.waiting(numberLine(waiting, lang)),
  };
}

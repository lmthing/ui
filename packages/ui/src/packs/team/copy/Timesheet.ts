import { numberLine, wordsFor, type StateName } from "../../../catalog";
import { teamWordsFor } from "../lang";

type Row = { name: string; hours: readonly number[]; approved: boolean };
type Input = { rows: readonly Row[]; detail?: "full" | "brief" };

const regularWeekHours = 40;
const hundredths = 100;
const roundedHours = (value: number) => Math.round(value * hundredths) / hundredths;

export function timesheetRow(hours: readonly number[], lang?: string) {
  const { hoursValue } = teamWordsFor(lang).timesheet;
  const total = roundedHours(hours.reduce((sum, value) => sum + value, 0));
  const overtime = roundedHours(total - regularWeekHours);
  return {
    days: hours.map((value) => numberLine(roundedHours(value), lang)),
    total: hoursValue(numberLine(total, lang)),
    overtime: overtime > 0 ? hoursValue(numberLine(overtime, lang)) : undefined,
  };
}

export function timesheetReading(input: unknown, _state: StateName, lang?: string): string[] {
  const { rows, detail } = input as Input;
  const { weekdayShort } = wordsFor(lang);
  const words = teamWordsFor(lang).timesheet;
  const lines = rows.map(({ name, hours, approved }) => {
    const { days, total, overtime } = timesheetRow(hours, lang);
    return words.rowReading(
      name,
      detail === "brief" ? [] : days.map((value, index) => words.dayReading(weekdayShort[index]!, value)),
      [words.summaryReading(total, overtime ?? words.noOvertime, approved ? words.approved : words.approve)],
    );
  });
  return [words.hours, ...lines];
}

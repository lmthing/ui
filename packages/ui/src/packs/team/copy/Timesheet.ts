import { numberLine, timeOfDayLine, wordsFor, type StateName } from "../../../catalog";
import { teamWordsFor } from "../lang";

type Punch = { day: number; from: string; to?: string | undefined };
type Row = {
  name: string;
  hours: readonly number[];
  approved: boolean;
  punches?: readonly Punch[] | undefined;
};
type Input = { rows: readonly Row[]; detail?: "full" | "brief"; style?: string };

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

export function canSubmitTimesheet({ style, rows }: Input) {
  const row = rows[0];
  return (
    style === "mine" &&
    !!row &&
    !row.approved &&
    !!row.punches?.length &&
    row.punches.every((punch) => punch.to !== undefined)
  );
}

export function timesheetPunch({ day, from, to }: Punch, lang?: string) {
  const words = teamWordsFor(lang).timesheet;
  const start = timeOfDayLine(from, lang);
  return {
    day: wordsFor(lang).weekdayNames[day]!,
    time: to ? words.punchRange(start, timeOfDayLine(to, lang)) : words.openPunch(start),
  };
}

function personalReading(input: Input, lang?: string) {
  const { name, hours, punches, approved } = input.rows[0]!;
  const { total, overtime } = timesheetRow(hours, lang);
  const w = teamWordsFor(lang).timesheet;
  const lines = [name, w.totalHours(total), ...(overtime ? [w.overtimeHours(overtime)] : [])];
  if (input.detail !== "brief") {
    lines.push(w.punches);
    if (!punches?.length) lines.push(w.noPunches);
    else
      for (const punch of punches) {
        const { day, time } = timesheetPunch(punch, lang);
        lines.push(w.dayReading(day, time));
      }
  }
  if (approved) lines.push(w.approved);
  if (canSubmitTimesheet(input)) lines.push(w.submit);
  return lines;
}

export function timesheetReading(input: unknown, _state: StateName, lang?: string): string[] {
  const sheet = input as Input;
  if (sheet.style === "mine") return personalReading(sheet, lang);
  const { rows, detail } = sheet;
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

import { compactMoneyLine } from "../../../catalog";
import { teamWordsFor } from "../lang";
import { shiftSchedule } from "./Shift";

type Shift = Parameters<typeof shiftSchedule>[0] & { pay?: number | undefined };
type Detail = "full" | "brief";

export function openShiftLines(shift: Shift, detail: Detail | undefined, lang?: string) {
  const { openShift, shiftTimeSeparator } = teamWordsFor(lang);
  return {
    ...shiftSchedule(shift, lang),
    pay:
      detail === "brief" || shift.pay === undefined
        ? undefined
        : compactMoneyLine(shift.pay, undefined, lang),
    timeSeparator: shiftTimeSeparator,
    detailSeparator: openShift.detailSeparator,
  };
}

export function openShiftReading(input: { shifts: Shift[]; detail?: Detail }, lang?: string) {
  const { openShift } = teamWordsFor(lang);
  const shifts = input.shifts.map((shift, index) => {
    const { date, range, pay, detailSeparator } = openShiftLines(shift, input.detail, lang);
    return `r${index + 1} ${date} ${range}${pay === undefined ? "" : `${detailSeparator}${pay}`}`;
  });
  return [...shifts, openShift.claim];
}

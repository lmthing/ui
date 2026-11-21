/** Date-only comparisons keep real elapsed time independent of local day length. */
function localDay(now: number, format: Intl.DateTimeFormat) {
  const parts = format.formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((entry) => entry.type === type)?.value;
  return `${part("year")?.padStart(4, "0")}-${part("month")}-${part("day")}`;
}

export function inLocalWeek(start: number, end: number, week: unknown, timeZone?: string) {
  if (typeof week !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(week)) return false;
  const monday = new Date(`${week}T00:00:00Z`);
  if (monday.getUTCDay() !== 1 || monday.toISOString().slice(0, 10) !== week) return false;
  monday.setUTCDate(monday.getUTCDate() + 7);
  const nextWeek = monday.toISOString().slice(0, 10);
  try {
    const format = new Intl.DateTimeFormat(undefined, {
      calendar: "iso8601",
      numberingSystem: "latn",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone,
    });
    return localDay(start, format) >= week && localDay(end - 1, format) < nextWeek;
  } catch {
    return false;
  }
}

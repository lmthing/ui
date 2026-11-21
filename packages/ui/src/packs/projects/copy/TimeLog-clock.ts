import { localeOf, type DeviceData, type Values } from "../../../catalog";

type Target = { projectRef: string; taskRef?: string; title: string; billable?: boolean };

function timeTarget({ projectRef, taskRef }: Readonly<Values>, data: DeviceData): Target | undefined {
  // The host exposes eligible projects and unblocked leaf tasks, not Writer-supplied eligibility.
  return data.project_time_targets?.find((row): row is Target => {
    if (!row || typeof row !== "object") return false;
    const target = row as Partial<Target>;
    return (
      typeof projectRef === "string" &&
      target.projectRef === projectRef &&
      target.taskRef === taskRef &&
      typeof target.title === "string"
    );
  });
}

export function timeLogZone(data: DeviceData): string | undefined {
  const row = data.project_calendar?.find((row) => row && typeof row === "object" && "timeZone" in row);
  return row && typeof row === "object" && "timeZone" in row && typeof row.timeZone === "string"
    ? row.timeZone
    : undefined;
}

export function offsetAt(time: number, format: Intl.DateTimeFormat) {
  const offset = format
    .formatToParts(time)
    .find(({ type }) => type === "timeZoneName")
    ?.value.slice(3);
  if (offset === "") return "+00:00";
  const match = /^([+-])(\d{1,2})(?::(\d{2}))?$/.exec(offset ?? "");
  return match && `${match[1]}${match[2]!.padStart(2, "0")}:${match[3] ?? "00"}`;
}

export function zoneFormat(timeZone?: string) {
  if (!timeZone) return;
  try {
    return new Intl.DateTimeFormat(localeOf(), { timeZone, timeZoneName: "shortOffset" });
  } catch {
    return;
  }
}

export function canTimeLog(input: Readonly<Values>, data: DeviceData) {
  const target = timeTarget(input, data);
  return Boolean(
    target?.title.trim() &&
    target.title.trim().length <= 32 &&
    Array.isArray(input.entries) &&
    input.entries.length < (input.style === "single_day" ? 6 : 14),
  );
}

export function timedEntry(
  { start, end }: { start: number; end: number },
  input: Readonly<Values>,
  data: DeviceData,
) {
  const target = timeTarget(input, data);
  const format = zoneFormat(timeLogZone(data));
  if (!target || !format) return;
  const from = localStamp(start, format),
    to = localStamp(end, format);
  if (!from || !to) return;
  return {
    projectRef: target.projectRef,
    ...(target.taskRef && { taskRef: target.taskRef }),
    title: target.title,
    billable: target.billable === true,
    start: from,
    end: to,
  };
}

function localStamp(time: number, format: Intl.DateTimeFormat) {
  if (!Number.isFinite(time)) return;
  const offset = offsetAt(time, format);
  if (!offset) return;
  const shift = Date.parse(`1970-01-01T00:00:00${offset}`);
  return new Date(time - shift).toISOString().slice(0, -1) + offset;
}

export function canStartTimeLog(data: DeviceData, input: Readonly<Values>, now: number) {
  if (!canTimeLog(input, data)) return false;
  const format = zoneFormat(timeLogZone(data));
  const stamp = format && localStamp(now, format);
  if (!stamp || (input.day && stamp.slice(0, 10) !== input.day)) return false;
  const rows = input.entries as { start: string; end: string }[];
  return !rows.some(({ start, end }) => Date.parse(start) <= now && now < Date.parse(end));
}

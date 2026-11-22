import { z } from "zod";
import type { ClockMeta, Meta } from "../../../meta";
import type { DeviceData, Values } from "../../index";
export const validTime = (value: number) => Number.isSafeInteger(value) && Math.abs(value) <= 8.64e15;

const offsetDate = z.iso.datetime({ offset: true });

export const hasTimestampClock = (meta: Meta) =>
  [meta.clocks, meta.items?.clocks, meta.items?.nested?.clocks].some((group) =>
    group?.some(({ timestamp }) => timestamp),
  );

export function timestampReading(
  clock: { spec: ClockMeta; holder: Values; outer: Values },
  data: DeviceData,
  now: number,
  max: number,
) {
  const { spec, holder, outer } = clock;
  if (!spec.timestamp || !validTime(now) || (spec.kind !== "until" && spec.kind !== "up")) return;
  const raw = spec.timestamp(data, holder, outer);
  const at = typeof raw === "number" ? raw : offsetDate.safeParse(raw).success ? Date.parse(raw!) : NaN;
  if (!validTime(at)) return;
  if (spec.kind === "until") return { seconds: Math.max(0, at - now), running: now < at };
  if (at > now) return { seconds: 0, running: true };
  const seconds = Math.min(max, Math.floor((now - at) / 1000));
  return { seconds, running: seconds < max };
}

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

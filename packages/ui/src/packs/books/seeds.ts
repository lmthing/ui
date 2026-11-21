import { z } from "zod";
import * as c from "../../catalog";

export const ref = c.text(32).regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/);
const offsetDateTime = z.iso.datetime({ offset: true });
export const dateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/)
  .refine((value) => offsetDateTime.safeParse(value).success, "Use a real ISO datetime with an offset");

export const seedDate = "2026-11-20";
export const seedPeriod = { from: seedDate, to: seedDate };
export const periodFields = { from: c.isoDate, to: c.isoDate };
const dayMs = 86_400_000;
const maxDays = 366;

export function validPeriod({ from, to }: { from: string; to: string }) {
  const span = Date.parse(to) - Date.parse(from);
  return span >= 0 && span < maxDays * dayMs;
}

export function distinct<T>(records: readonly T[], key: (record: T) => string): boolean {
  return new Set(records.map(key)).size === records.length;
}

export function seedTitle({ cast, lang }: c.FallbackInput, max: number, index = 0): string {
  const thing = c.thingOf(cast);
  const item = c.itemsOf(cast, index + 1)[index];
  return (item && c.titleOf(item, max, thing)) || c.clip(c.placeholderTitle(index, lang), max);
}

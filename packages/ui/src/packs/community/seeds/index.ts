import { z } from "zod";
import { itemsOf, placeholderTitle, text, thingOf, titleOf, type FallbackInput } from "../../../catalog";

export const ref = text(24)
  .regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/)
  .meta({ kind: "ref" });
export const seedDate = "2026-11-18";
const offsetDateTime = z.iso.datetime({ offset: true });
export const dateTime = z
  .string()
  .max(40)
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/)
  .refine((value) => offsetDateTime.safeParse(value).success);

export function distinct<T>(rows: readonly T[], key: (row: T) => string): boolean {
  return new Set(rows.map(key)).size === rows.length;
}

export function seedTitle({ cast, lang }: FallbackInput, limit: number): string {
  const thing = thingOf(cast);
  const [item] = itemsOf(cast, 1);
  return (item && titleOf(item, limit, thing)) || placeholderTitle(0, lang);
}

import { z } from "zod";
import * as c from "../../catalog";

export const recordId = c.text(24).regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/);
const offsetDateTime = z.iso.datetime({ offset: true });
export const dateTime = z
  .string()
  .max(35)
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/)
  .refine((value) => offsetDateTime.safeParse(value).success, "Use a real ISO datetime with an offset")
  .meta({ kind: "text" });
export const seedTime = "2026-01-01T00:00:00Z";

export function distinct<T>(records: readonly T[], key: (record: T) => string): boolean {
  return new Set(records.map(key)).size === records.length;
}

export function seedAssets({ cast, lang }: c.FallbackInput, count: number) {
  const thing = c.thingOf(cast);
  const items = c.itemsOf(cast, count);
  return (items.length ? items : [undefined]).map((item, index) => {
    const placeholder = c.placeholderTitle(index, lang);
    const name = (item && c.titleOf(item, 32, thing)) || c.clip(placeholder, 32);
    return { assetId: `item_${index + 1}`, name, symbol: c.clip(name, 12) };
  });
}

export function seedPortfolio({ cast }: c.FallbackInput): string {
  const type = c.thingOf(cast)?.type;
  const id = typeof type === "string" ? c.clip(type.toLowerCase(), 24) : "";
  return recordId.safeParse(id).success ? id : "item_1";
}

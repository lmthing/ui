import {
  detailOf,
  itemsOf,
  placeholderTitle,
  text,
  thingOf,
  titleOf,
  type FallbackInput,
} from "../../../catalog";
import { z } from "zod";

export const ref = text(32).regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/);
export const dateTime = z.iso.datetime({ offset: true });
export const seedDate = "2026-11-18";
export const seedTime = `${seedDate}T09:00:00Z`;

export function distinct<T>(records: readonly T[], key: (record: T) => string | number): boolean {
  return new Set(records.map(key)).size === records.length;
}

export function seedLabels({ cast, lang }: FallbackInput, count = 1) {
  const thing = thingOf(cast);
  const items = itemsOf(cast, count);
  return (items.length ? items : [undefined]).map((item, index) => ({
    ref: `item_${index + 1}`,
    title: (item && titleOf(item, 32, thing)) || placeholderTitle(index, lang),
    short: (item && titleOf(item, 24, thing)) || placeholderTitle(index, lang),
    detail: item && detailOf(item, 36, thing),
  }));
}

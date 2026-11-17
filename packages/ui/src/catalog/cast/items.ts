import type { CastLike } from "../types";

type CastItem = CastLike["items"][number];
type CastThing = CastLike["things"][number];
const reserved = new Set(["id", "type", "sample"]);

/** The thing a fallback is about: the given type, else the cast's first thing. */
export function thingOf(cast: CastLike, type?: string): CastThing | undefined {
  return type ? cast.things.find((thing) => thing.type === type) : cast.things[0];
}

/** Up to `count` items of one thing type (the first thing's type, else the first item's). */
export function itemsOf(cast: CastLike, count: number, type?: string): CastItem[] {
  const kind = type ?? cast.things[0]?.type ?? cast.items[0]?.type;
  return cast.items.filter((item) => item.type === kind).slice(0, count);
}

/** The item's string values in the order its thing declares its fields, never guessed by name. */
export function textsOf(item: CastItem, thing?: CastThing): string[] {
  const keys = thing?.fields ?? Object.keys(item).filter((key) => !reserved.has(key));
  return keys
    .map((key) => item[key])
    .filter((value): value is string => typeof value === "string" && value.trim() !== "")
    .map((value) => value.trim());
}

/** Cut text to a prop's limit on a word boundary when possible. */
export function clip(value: string, max: number): string {
  if (value.length <= max) return value;
  const cut = value.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return (space > max / 2 ? cut.slice(0, space) : cut).trim();
}

/** First text of an item (its title) and the next one (its detail), each clipped. */
export function titleOf(item: CastItem, max: number, thing?: CastThing): string | undefined {
  const first = textsOf(item, thing)[0];
  return first ? clip(first, max) : undefined;
}
export function detailOf(item: CastItem, max: number, thing?: CastThing): string | undefined {
  const second = textsOf(item, thing)[1];
  return second ? clip(second, max) : undefined;
}

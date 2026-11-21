import * as c from "../../catalog";

export const seedDate = "2026-11-20";
export const seedTime = "09:00";

export function seedTitles({ cast, lang }: c.FallbackInput, max: number, count: number): string[] {
  const thing = c.thingOf(cast);
  const titles = c.itemsOf(cast, count).flatMap((item) => {
    const title = c.titleOf(item, max, thing);
    return title ? [title] : [];
  });
  return titles.length ? titles : [c.clip(c.placeholderTitle(0, lang), max)];
}

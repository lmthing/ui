import { detailOf, itemsOf, placeholderTitle, thingOf, titleOf, type FallbackInput } from "../../../catalog";

export const seedMonday = "2026-11-16";
export const seedFriday = "2026-11-20";
export const seedSunday = "2026-11-22";

export function seedLabels({ cast, lang }: FallbackInput) {
  const thing = thingOf(cast);
  const item = itemsOf(cast, 1)[0];
  return {
    title: (item && titleOf(item, 32, thing)) || placeholderTitle(0, lang),
    detail: (item && detailOf(item, 36, thing)) || placeholderTitle(1, lang),
  };
}

export const unique = (refs: readonly string[]) => new Set(refs).size === refs.length;
export const dayMs = 86_400_000;
export const dayOf = (date: string) => Date.parse(`${date}T00:00:00Z`) / dayMs;

type Link = { taskRef: string; after: readonly string[] };

/** Check the visible subgraph; host validation owns refs outside the current slice. */
export function acyclic(tasks: readonly Link[]): boolean {
  const links = new Map(tasks.map(({ taskRef, after }) => [taskRef, after]));
  const visiting = new Set<string>();
  const checked = new Set<string>();
  const visit = (ref: string): boolean => {
    if (visiting.has(ref)) return false;
    if (checked.has(ref) || !links.has(ref)) return true;
    visiting.add(ref);
    if (!links.get(ref)!.every(visit)) return false;
    visiting.delete(ref);
    checked.add(ref);
    return true;
  };
  return tasks.every(({ taskRef }) => visit(taskRef));
}

import { itemsOf, placeholderTitle, thingOf, titleOf, type CastLike, type ActionName } from "../../catalog";

export function seedTitles(cast: CastLike, count: number, max: number): string[] {
  const thing = thingOf(cast);
  const titles = itemsOf(cast, count).flatMap((item) => {
    const title = titleOf(item, max, thing);
    return title ? [title] : [];
  });
  return titles.length ? titles : Array.from({ length: count }, (_, index) => placeholderTitle(index));
}

export function indexedParts(count: number, names: readonly string[]): string[] {
  return Array.from({ length: count }, (_, index) => names.map((name) => `${name}_${index + 1}`)).flat();
}

export function indexedActions(count: number, names: Record<string, readonly ActionName[]>) {
  return Object.fromEntries(
    Array.from({ length: count }, (_, index) =>
      Object.entries(names).map(([name, actions]) => [`${name}_${index + 1}`, actions]),
    ).flat(),
  );
}

export function indexedWhen(count: number, names: readonly string[]) {
  return Object.fromEntries(
    Array.from({ length: count }, (_, index) =>
      names.map((name) => [`${name}_${index + 1}`, { [`has_${index + 1}`]: true }]),
    ).flat(),
  );
}

/** Project bounded nested controls to ordinary named parts, never Writer-owned props. */
export function indexedValues(
  rows: readonly Record<string, unknown>[],
  count: number,
  names: readonly string[],
) {
  return Object.fromEntries(
    Array.from({ length: count }, (_, index) => [
      [`has_${index + 1}`, index < rows.length],
      ...names.map((name) => [`${name}_${index + 1}`, rows[index]?.[name]]),
    ]).flat(),
  );
}

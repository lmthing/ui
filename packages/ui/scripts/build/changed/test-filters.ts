function filter(name: string) {
  return process.env[name]?.split(",").filter(Boolean);
}

const unfiltered = (suite: string | undefined) =>
  suite && filter("UI_TEST_UNFILTERED")?.some((file) => suite.endsWith(`/${file}`));

export const componentFilter = (suite?: string) =>
  unfiltered(suite) ? undefined : filter("UI_TEST_COMPONENTS");

export function selectedIds<T extends string>(ids: readonly T[], suite?: string): T[] {
  const selected = componentFilter(suite);
  return selected ? ids.filter((id) => selected.includes(id)) : [...ids];
}

export function selectedEntries<T>(entries: Record<string, T>, suite?: string): [string, T][] {
  const selected = componentFilter(suite);
  return Object.entries(entries).filter(([id]) => !selected || selected.includes(id));
}

export function wholePack(pack: string, suite?: string) {
  return unfiltered(suite) || (filter("UI_TEST_PACKS")?.includes(pack) ?? !componentFilter(suite));
}

export function selectedLayouts(
  metas: readonly {
    id: string;
    layouts: Record<string, { slots: readonly { allow: readonly string[] }[] }>;
  }[],
  suite?: string,
): string[] | undefined {
  const selected = componentFilter(suite);
  if (!selected) return;
  return metas.flatMap((meta) =>
    Object.entries(meta.layouts)
      .filter(([, layout]) => layout.slots.some((slot) => slot.allow.some((id) => selected.includes(id))))
      .map(([layout]) => `${meta.id}/${layout}`),
  );
}

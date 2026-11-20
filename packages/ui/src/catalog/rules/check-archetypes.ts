import type { ArchetypeOverrides, CoreArchetypeMeta } from "../archetypes";
import type { ArchetypeMeta, PackId } from "../meta";
import type { Definition } from "../probes";

type Input = {
  archetypes: Record<string, { meta: CoreArchetypeMeta }>;
  packArchetypes: Partial<Record<PackId, readonly ArchetypeMeta[]>>;
  components: Record<string, Definition>;
  packOf: Partial<Record<string, PackId>>;
};
type OverrideInput = Omit<Input, "packArchetypes"> & {
  packArchetypeOverrides?: Partial<Record<PackId, ArchetypeOverrides>>;
};
type Entry = { owner: PackId | "core"; meta: CoreArchetypeMeta | ArchetypeMeta };
type Layout = CoreArchetypeMeta["layouts"][string] | ArchetypeMeta["layouts"][string];

function checkLayoutComponents(
  input: Pick<Input, "components" | "packOf">,
  owner: Entry["owner"],
  address: string,
  recipe: Layout,
  defaults: readonly { c: string }[],
): string[] {
  const slots = "slots" in recipe ? recipe.slots : recipe.recipe;
  const ids = new Set([...slots.flatMap((slot) => slot.allow), ...defaults.map((line) => line.c)]);
  return [...ids].flatMap((id) => {
    const definition = input.components[id];
    if (!definition || definition.meta.id !== id)
      return [`${owner}: ${address}: recipe names unknown component ${id}`];
    if (input.packOf[id] && input.packOf[id] !== owner)
      return [`${owner}: ${address}: recipe names ${input.packOf[id]} component ${id}`];
    return [];
  });
}

function checkLayouts({ owner, meta }: Entry, input: Input): string[] {
  const issues: string[] = [];
  const layouts = Object.keys(meta.layouts);
  const at = (layout: string, what: string) => `${owner}: ${meta.id}/${layout}: ${what}`;
  // Core patterns have per-layout defaults, not the pack's explicit defaultLayout.
  const defaultLayout = "defaultLayout" in meta ? meta.defaultLayout : layouts[0];
  if (!defaultLayout || !Object.hasOwn(meta.layouts, defaultLayout))
    issues.push(at(defaultLayout ?? "-", "defaultLayout does not name a layout"));
  if ("defaults" in meta)
    for (const layout of Object.keys(meta.defaults))
      if (!Object.hasOwn(meta.layouts, layout)) issues.push(at(layout, "default names a missing layout"));
  const recipes: Readonly<Record<string, Layout>> = meta.layouts;
  for (const [layout, recipe] of Object.entries(recipes)) {
    const defaults =
      "defaults" in recipe ? recipe.defaults : "defaults" in meta ? (meta.defaults[layout] ?? []) : [];
    issues.push(...checkLayoutComponents(input, owner, `${meta.id}/${layout}`, recipe, defaults));
  }
  return issues;
}

export function checkArchetypeOverrides(input: OverrideInput): string[] {
  const claimed = new Map<string, string>();
  const issues: string[] = [];
  for (const [owner, overrides] of Object.entries(input.packArchetypeOverrides ?? {}))
    for (const [id, layouts] of Object.entries(overrides)) {
      if (!Object.hasOwn(input.archetypes, id)) issues.push(`${owner}: ${id}/-: unknown core archetype`);
      if (!Object.keys(layouts).length) issues.push(`${owner}: ${id}/-: no layout overrides`);
      for (const [layout, recipe] of Object.entries(layouts)) {
        const address = `${id}/${layout}`;
        if (!/^[a-z][a-z0-9_-]*$/.test(layout)) issues.push(`${owner}: ${address}: invalid layout id`);
        const previous = claimed.get(address);
        if (previous) issues.push(`${owner}: ${address}: duplicate layout override (already in ${previous})`);
        claimed.set(address, owner);
        issues.push(...checkLayoutComponents(input, owner as PackId, address, recipe, recipe.defaults));
      }
    }
  return issues;
}

/** Archetypes occupy a separate namespace; layout keys are local to their archetype. */
export function checkArchetypes(input: Input): string[] {
  const entries: Entry[] = [
    ...Object.values(input.archetypes).map(({ meta }) => ({ owner: "core" as const, meta })),
    ...Object.entries(input.packArchetypes).flatMap(([owner, metas]) =>
      metas.map((meta) => ({ owner: owner as PackId, meta })),
    ),
  ];
  const seen = new Map<string, Entry["owner"]>();
  return entries.flatMap((entry) => {
    const previous = seen.get(entry.meta.id);
    seen.set(entry.meta.id, entry.owner);
    return [
      ...(previous
        ? [`${entry.owner}: ${entry.meta.id}/-: duplicate archetype id (already in ${previous})`]
        : []),
      ...checkLayouts(entry, input),
    ];
  });
}

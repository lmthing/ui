import type { CoreArchetypeMeta } from "../archetypes";
import type { ArchetypeMeta, PackId } from "../meta";
import type { Definition } from "../probes";

type Input = {
  archetypes: Record<string, { meta: CoreArchetypeMeta }>;
  packArchetypes: Partial<Record<PackId, readonly ArchetypeMeta[]>>;
  components: Record<string, Definition>;
  packOf: Partial<Record<string, PackId>>;
};
type Entry = { owner: PackId | "core"; meta: CoreArchetypeMeta | ArchetypeMeta };
type Layout = CoreArchetypeMeta["layouts"][string] | ArchetypeMeta["layouts"][string];

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
    const slots = "slots" in recipe ? recipe.slots : recipe.recipe;
    const ids = [
      ...slots.flatMap((slot) => slot.allow),
      ...("defaults" in recipe
        ? recipe.defaults
        : "defaults" in meta
          ? (meta.defaults[layout] ?? [])
          : []
      ).map((line) => line.c),
    ];
    for (const id of new Set(ids)) {
      const definition = input.components[id];
      if (!definition || definition.meta.id !== id)
        issues.push(at(layout, `recipe names unknown component ${id}`));
      else if (input.packOf[id] && input.packOf[id] !== owner)
        issues.push(at(layout, `recipe names ${input.packOf[id]} component ${id}`));
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

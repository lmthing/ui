import { legacyTarget } from "../migrations";
import { archetypes, defaultLines, type CoreArchetypeMeta } from "../archetypes";
import type { CastLike } from "../types";
import type { PackId, ArchetypeMeta } from "../meta";
import { packComposition, type Definition } from "../probes";

export type RegistryOptions = { packs?: readonly PackId[]; includeDrafts?: boolean };

const normal = (name: string) => name.replace(/[\s_-]/g, "").toLowerCase();

/**
 * A registry over component definitions. The catalog entry wraps this as `createRegistry()`
 * over generated data. Packs load as a whole; core drafts are left out unless asked for.
 */
export function registryOf<D extends Record<string, Definition>>(
  components: D,
  options: RegistryOptions = {},
  packOf: Partial<Record<keyof D & string, PackId>> = {},
  isPackReady: (id: PackId) => boolean = () => false,
  packArchetypes: Partial<Record<PackId, readonly ArchetypeMeta[]>> = {},
) {
  const selected = new Set(options.packs?.filter((pack) => options.includeDrafts || isPackReady(pack)));
  const ids = (Object.keys(components) as (keyof D & string)[]).filter((id) =>
    packOf[id] ? selected.has(packOf[id]!) : options.includeDrafts || components[id]!.meta.status !== "draft",
  );
  const scoped = Object.fromEntries(ids.map((id) => [id, components[id]!])) as Partial<D>;
  const patterns: Record<string, { meta: CoreArchetypeMeta }> = {
    ...archetypes,
    ...Object.fromEntries(
      [...selected].flatMap((pack) =>
        (packArchetypes[pack] ?? []).map((meta) => [meta.id, { meta: packComposition(meta) }]),
      ),
    ),
  };
  return {
    archetypes: patterns,
    defaultLines: (id: string, layout: string, cast: CastLike) => {
      if (!patterns[id]) throw new Error(`Unknown archetype: ${id}`);
      return defaultLines(patterns[id].meta, layout, cast, { defs: ids.map((name) => components[name]!) });
    },
    ids,
    packOf,
    defs: ids.map((id) => components[id]!),
    get: <Id extends keyof D>(id: Id) => scoped[id],
    schema: <Id extends keyof D>(id: Id) => scoped[id]?.props,
    resolve: (name: string) => {
      const wanted = normal(name);
      return (
        ids.find((id) => id === name) ??
        ids.find((id) => normal(id) === wanted) ??
        ids.find((id) => id === legacyTarget(name))
      );
    },
  };
}

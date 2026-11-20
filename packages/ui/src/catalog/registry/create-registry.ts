import { legacyTarget } from "../migrations";
import { defaultLines, type ArchetypeOverrides } from "../archetypes";
import type { CastLike } from "../types";
import type { PackId, ArchetypeMeta } from "../meta";
import type { Definition } from "../probes";
import { scopedArchetypes } from "./scoped-archetypes";

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
  packArchetypeOverrides: Partial<Record<PackId, ArchetypeOverrides>> = {},
) {
  const selected = new Set(options.packs?.filter((pack) => options.includeDrafts || isPackReady(pack)));
  const ids = (Object.keys(components) as (keyof D & string)[]).filter((id) =>
    packOf[id] ? selected.has(packOf[id]!) : options.includeDrafts || components[id]!.meta.status !== "draft",
  );
  const scoped = Object.fromEntries(ids.map((id) => [id, components[id]!])) as Partial<D>;
  const { archetypes, packComposeArchetypes } = scopedArchetypes(
    selected,
    packArchetypes,
    packArchetypeOverrides,
  );
  return {
    archetypes,
    packComposeArchetypes,
    defaultLines: (id: string, layout: string, cast: CastLike) => {
      if (!Object.hasOwn(archetypes, id)) throw new Error(`Unknown archetype: ${id}`);
      return defaultLines(archetypes[id]!.meta, layout, cast, { defs: ids.map((name) => components[name]!) });
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

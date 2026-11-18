import { legacyTarget } from "../migrations/aliases";
import { archetypes, defaultLines, type ArchetypeName } from "../archetypes";
import type { CastLike } from "../types";
import type { PackId } from "../meta";
import type { Definition } from "../probes";

export type RegistryOptions = { packs?: readonly PackId[]; includeDrafts?: boolean };

const normal = (name: string) => name.replace(/[\s_-]/g, "").toLowerCase();

/**
 * A registry over component definitions. The catalog entry wraps this as `createRegistry()`
 * over the generated `components` map. Drafts are left out unless asked for.
 */
export function registryOf<D extends Record<string, Definition>>(
  components: D,
  options: RegistryOptions = {},
  packOf: Partial<Record<keyof D & string, PackId>> = {},
) {
  const ids = (Object.keys(components) as (keyof D & string)[]).filter(
    (id) =>
      (!packOf[id] || options.packs?.includes(packOf[id]!)) &&
      (options.includeDrafts || components[id]!.meta.status !== "draft"),
  );
  const scoped = Object.fromEntries(ids.map((id) => [id, components[id]!])) as Partial<D>;
  const aliases = [...ids.filter((id) => packOf[id]), ...ids.filter((id) => !packOf[id])];
  return {
    archetypes,
    defaultLines: (id: ArchetypeName, layout: string, cast: CastLike) =>
      defaultLines(archetypes[id].meta, layout, cast, components),
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
        aliases.find((id) => components[id]!.meta.aliases.some((alias) => normal(alias) === wanted)) ??
        ids.find((id) => id === legacyTarget(name))
      );
    },
  };
}

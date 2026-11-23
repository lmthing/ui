import { componentRegistryOf } from "./components";
import { defaultLines, type ArchetypeOverrides } from "../archetypes";
import type { CastLike } from "../types";
import type { PackId, ArchetypeMeta } from "../meta";
import type { Definition } from "../probes";
import { scopedArchetypes } from "./scoped-archetypes";

export type RegistryOptions = { packs?: readonly PackId[]; includeDrafts?: boolean };

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
  const registry = componentRegistryOf(components, packOf, selected, options.includeDrafts);
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
      return defaultLines(archetypes[id]!.meta, layout, cast, { defs: registry.defs });
    },
    ...registry,
  };
}

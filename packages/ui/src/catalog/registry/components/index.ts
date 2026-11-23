import { legacyTarget } from "../../migrations";
import type { PackId } from "../../meta";
import type { Definition } from "../../probes";

const normal = (name: string) => name.replace(/[\s_-]/g, "").toLowerCase();

export function componentRegistryOf<D extends Record<string, Definition>>(
  components: D,
  packOf: Partial<Record<keyof D & string, PackId>>,
  selected: ReadonlySet<PackId>,
  includeDrafts?: boolean,
) {
  const ids = (Object.keys(components) as (keyof D & string)[]).filter((id) =>
    packOf[id] ? selected.has(packOf[id]!) : includeDrafts || components[id]!.meta.status !== "draft",
  );
  const scoped = Object.fromEntries(ids.map((id) => [id, components[id]!])) as Partial<D>;
  return {
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

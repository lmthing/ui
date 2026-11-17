import type { Definition } from "../probes";

const normal = (name: string) => name.replace(/[\s_-]/g, "").toLowerCase();

/**
 * A registry over component definitions. The catalog entry wraps this as `createRegistry()`
 * over the generated `components` map. Drafts are left out unless asked for.
 */
export function registryOf<D extends Record<string, Definition>>(
  components: D,
  options: { includeDrafts?: boolean } = {},
) {
  const ids = (Object.keys(components) as (keyof D & string)[]).filter(
    (id) => options.includeDrafts || components[id]!.meta.status !== "draft",
  );
  return {
    ids,
    defs: ids.map((id) => components[id]!),
    get: <Id extends keyof D>(id: Id) => components[id],
    schema: <Id extends keyof D>(id: Id) => components[id]!.props,
    resolve: (name: string) => {
      const wanted = normal(name);
      return (
        ids.find((id) => id === name) ??
        ids.find((id) => normal(id) === wanted) ??
        ids.find((id) => components[id]!.meta.aliases.some((alias) => normal(alias) === wanted))
      );
    },
  };
}

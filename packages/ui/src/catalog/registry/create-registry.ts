import type { z } from "zod";
import type { CastLike, Meta } from "../index";

type Definition = {
  meta: Meta; props: z.ZodType; examples: readonly unknown[];
  fallback: (input: { cast: CastLike }) => unknown; probes: readonly unknown[];
};
export function createCatalogRegistry<D extends Record<string, Definition>>(components: D) {
  const ids = Object.keys(components) as (keyof D & string)[];
  return {
    ids,
    get: <Id extends keyof D>(id: Id) => components[id],
    schema: <Id extends keyof D>(id: Id) => components[id]!.props,
    resolve: (name: string) => {
      const normalized = name.replace(/[_-]/g, "").toLowerCase();
      return ids.find((id) => id === name) ?? ids.find((id) => {
        const def = components[id]!;
        return [id, ...def.meta.aliases].some((alias) => alias.replace(/[_-]/g, "").toLowerCase() === normalized);
      });
    },
  };
}

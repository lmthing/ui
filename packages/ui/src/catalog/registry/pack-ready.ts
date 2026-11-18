import type { PackId, PackMeta } from "../meta";
import type { Definition } from "../probes";
import { registryOf } from "./create-registry";

export type PackReadyInput = {
  components: Readonly<Record<string, Definition>>;
  packOf: Readonly<Partial<Record<string, PackId>>>;
  packs: Readonly<Partial<Record<PackId, PackMeta>>>;
  packExamples: Readonly<Partial<Record<PackId, string>>>;
};

/** Generated metadata represents pack.ts; example lines must validate without repair. */
export function packReady(id: PackId, input: PackReadyInput): boolean {
  const pack = input.packs[id];
  const defs = Object.entries(input.components)
    .filter(([name]) => input.packOf[name] === id)
    .map(([, def]) => def);
  if (!pack?.example.trim() || !defs.length || defs.some((def) => def.meta.status !== "ready")) return false;
  const lines = input.packExamples[id]
    ?.trim()
    .split(/\r?\n/)
    .filter((line) => line.trim());
  if (!lines?.length) return false;
  // The pack's statuses are checked above; bypass its gate while retaining the core draft rule.
  const registry = registryOf(input.components, { packs: [id] }, input.packOf, () => true);
  return lines.every((line) => {
    try {
      const { c, id: _id, ...props } = JSON.parse(line);
      const resolved = typeof c === "string" ? registry.resolve(c) : undefined;
      return !!resolved && !!registry.schema(resolved)?.safeParse(props).success;
    } catch {
      return false;
    }
  });
}

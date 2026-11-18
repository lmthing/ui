import type { PackId, Meta } from "../meta";
import type { Definition } from "../probes";

const groups: readonly Meta["group"][] = [
  "structure",
  "content",
  "data",
  "input",
  "action",
  "beyond",
  "signature",
  "escape",
];

/** One choice line per component in the requested scope, in catalog group order then id. */
export function buildBlock(
  registry: { defs: readonly Definition[]; packOf: Partial<Record<string, PackId>> },
  scope: "core" | PackId,
): string {
  return registry.defs
    .filter(({ meta }) => !meta.codeOwned && (registry.packOf[meta.id] ?? "core") === scope)
    .sort((a, b) => {
      const group = groups.indexOf(a.meta.group) - groups.indexOf(b.meta.group);
      return group || (a.meta.id < b.meta.id ? -1 : a.meta.id > b.meta.id ? 1 : 0);
    })
    .map(({ meta }) => `- ${meta.id}: ${meta.purpose} Pick: ${meta.pick}`)
    .join("\n");
}

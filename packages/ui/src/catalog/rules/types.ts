import { legacyTarget } from "../migrations";
import type { Definition } from "../probes";
import type { ScreenLike } from "../agent";
export type Issue = { code: string; address: string; message: string };
export type RegistryLike = Record<string, Definition> | { defs: readonly Definition[] };
export type ScreenEntry = ScreenLike["components"][number];
export function definitionsOf(registry: RegistryLike): Record<string, Definition> {
  return Array.isArray(registry.defs)
    ? Object.fromEntries(registry.defs.map((def: Definition) => [def.meta.id, def]))
    : (registry as Record<string, Definition>);
}
const normal = (value: string) => value.replace(/[\s_-]/g, "").toLowerCase();
export function resolveDefinition(defs: Record<string, Definition>, name: string): Definition | undefined {
  return (
    defs[name] ??
    Object.values(defs).find((def) => normal(def.meta.id) === normal(name)) ??
    defs[legacyTarget(name) ?? ""]
  );
}
export const at = (screen: ScreenLike, entry?: ScreenEntry) =>
  entry ? `${screen.id}/${entry.id}/root` : screen.id;

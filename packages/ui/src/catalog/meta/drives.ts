import type { Definition } from "../probes";
import type { Meta } from "./meta";
import type { PackId } from "./pack-ids";

function hasDrivePress(meta: Meta) {
  return Boolean(meta.items?.parts.includes("root") && meta.actions?.items?.root?.includes("press"));
}

export function driveSeekPart(meta: Meta) {
  const parts = Object.entries(meta.actions?.parts ?? {}).filter(([, actions]) => actions.includes("seek"));
  const part = parts.length === 1 ? parts[0]?.[0] : undefined;
  return part && meta.parts?.includes(part) ? part : undefined;
}

/** Check the declaration against the full catalog, where pack ownership is known. */
export function checkDriveDeclaration(
  meta: Meta,
  defs: Record<string, Definition>,
  packOf: Readonly<Partial<Record<string, PackId>>>,
): string[] {
  if (meta.drives === undefined) return [];
  const label = `${meta.id}: drives`;
  const target = Object.hasOwn(defs, meta.drives) ? defs[meta.drives]?.meta : undefined;
  if (!target || target.id !== meta.drives || target.id === meta.id)
    return [`${label} must name another catalog component`];
  const pack = Object.hasOwn(packOf, target.id) ? packOf[target.id] : undefined;
  if (pack && pack !== packOf[meta.id]) return [`${label} target must be core or in the same pack`];
  if (!hasDrivePress(meta)) return [`${label} requires an item root press`];
  if (!driveSeekPart(target)) return [`${label} target must declare exactly one component seek part`];
  return [];
}

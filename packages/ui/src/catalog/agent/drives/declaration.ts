import type { Definition } from "../../probes";
import type { Meta, PackId } from "../../meta";
import type { DriveBindings, SiblingPart } from "../../meta";

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
  if (typeof meta.drives !== "string") return checkBindings(meta, meta.drives, defs, packOf);
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

function checkBindings(
  meta: Meta,
  bindings: DriveBindings,
  defs: Record<string, Definition>,
  packOf: Readonly<Partial<Record<string, PackId>>>,
) {
  const errors: string[] = [];
  const seen = new Set<string>();
  const destination = (to: SiblingPart | { self: true; part: string }, action: string) => {
    const target =
      "self" in to ? meta : Object.hasOwn(defs, to.component) ? defs[to.component]?.meta : undefined;
    const pack = target && Object.hasOwn(packOf, target.id) ? packOf[target.id] : undefined;
    if (
      !target ||
      (pack && packOf[meta.id] !== pack) ||
      ("component" in to && target.id !== to.component) ||
      !target.parts?.includes(to.part) ||
      !target.actions?.parts?.[to.part]?.some((a) => a === action)
    )
      errors.push(`${meta.id}: drives target must declare ${to.part}.${action} in core or the same pack`);
  };
  for (const command of bindings.commands ?? []) {
    const { scope, part, to, action } = command;
    const key = `${scope}/${part}`;
    const item = scope === "item";
    const parts = item ? meta.items?.parts : meta.parts;
    const actions = item ? meta.actions?.items : meta.actions?.parts;
    if (seen.has(key) || !parts?.includes(part) || !actions?.[part]?.includes("press"))
      errors.push(`${meta.id}: drives source must be a unique declared ${key} press`);
    seen.add(key);
    destination(to, action);
  }
  if (bindings.observe) destination(bindings.observe.from, "seek");
  return errors;
}

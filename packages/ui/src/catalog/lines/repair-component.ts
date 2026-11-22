import { z } from "zod";
import type { JsonSchema } from "../format";
import { migrateLine } from "../migrations";
import type { Definition, FallbackInput } from "../probes";
import { screenId } from "../props";
import { repairVariants } from "../rules";
import type { StateName } from "../types";
import { lineCodes as code, type LineCode } from "./codes";
import { isValues, repairFields } from "./repair-fields";

export type LineRegistry = { defs: readonly Definition[] };
export type RepairContext = FallbackInput & { photoTags?: readonly string[] };
export type PendingComponent = { c: string; id?: string; state?: StateName } & Record<string, unknown>;

function parts(line: Record<string, unknown>) {
  const { c: _c, id, state, ...props } = line;
  return { id, state, props };
}

function envelope(def: Definition, id: unknown, state: unknown, codes: Set<LineCode>): PendingComponent {
  const component: PendingComponent = { c: def.meta.id };
  if (typeof id === "string" && screenId.safeParse(id).success) component.id = id;
  else if (id !== undefined) codes.add(code.strip);
  const states = def.meta.states ?? ["filled"];
  if (typeof state === "string" && states.some((available) => available === state))
    component.state = state as StateName;
  else if (state !== undefined) codes.add(code.strip);
  return component;
}

function repairProps(
  def: Definition,
  props: Record<string, unknown>,
  ctx: RepairContext,
  codes: Set<LineCode>,
) {
  const variants = repairVariants(def, props);
  variants.codes.forEach((entry) => codes.add(entry));
  const shape = z.toJSONSchema(def.props, {
    io: "input",
    unrepresentable: "any",
    reused: "inline",
  }) as JsonSchema;
  return repairFields(variants.props as Record<string, unknown>, shape, def.fallback(ctx), {
    codes,
    photoTags: ctx.photoTags,
  });
}

/** Validate an exact scoped id (or a saved-input migration), then repair and revalidate its wire props. */
export function repairComponent(
  line: unknown,
  registry: LineRegistry,
  ctx: RepairContext,
): { component?: PendingComponent; codes: LineCode[] } {
  if (!isValues(line) || typeof line.c !== "string" || !Object.hasOwn(line, "c"))
    return { codes: [code.componentDrop] };
  const exact = (id: unknown) => registry.defs.find((def) => def.meta.id === id);
  let def = exact(line.c);
  let { id, state, props } = parts(line);
  const codes = new Set<LineCode>();
  let valid = def?.props.safeParse(props).success;
  if (!valid) {
    // A saved migration may change a retired id, but never shadow a scoped exact match.
    const options = { variantComponents: def ? [def.meta.id] : [] };
    let migrated = migrateLine(line, options);
    if (def && migrated.c !== line.c) migrated = migrateLine(line, { ...options, variantOnly: true });
    if (migrated !== line) {
      codes.add(code.migrate);
      def = exact(migrated.c);
      ({ id, state, props } = parts(migrated));
      valid = def?.props.safeParse(props).success;
    }
    if (!def) return { codes: [code.componentDrop] };
    if (!valid) {
      props = repairProps(def, props, ctx, codes);
      if (!def.props.safeParse(props).success) return { codes: [...codes, code.componentDrop] };
    }
  }
  if (!def) return { codes: [code.componentDrop] };
  const fields = envelope(def, id, state, codes);
  // Keep inputs, not computed Zod output: readers and renderers parse the wire value themselves.
  return { component: { ...props, ...fields }, codes: [...codes] };
}

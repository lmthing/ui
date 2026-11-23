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
  const variants = repairVariants(def, dropInvalidItems(def, props, codes));
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

/** Some collections must omit invalid entries rather than infer or repair their contents. */
function omitOptionalNulls(schema: z.ZodType, item: unknown): unknown {
  if (!(schema instanceof z.ZodObject) || !isValues(item)) return item;
  return Object.fromEntries(
    Object.entries(item).filter(([key, value]) => {
      const field: unknown = Object.hasOwn(schema.shape, key) ? schema.shape[key] : undefined;
      return !(value === null && field instanceof z.ZodOptional && !z.safeParse(field, null).success);
    }),
  );
}

function dropInvalidItems(def: Definition, props: Record<string, unknown>, codes: Set<LineCode>) {
  const schema = def.props;
  if (!(schema instanceof z.ZodObject)) return props;
  const input = { ...props };
  for (const [key, field] of Object.entries(schema.shape)) {
    const items = input[key];
    if (
      !(field instanceof z.ZodArray) ||
      field.meta()?.repair !== "drop_invalid_items" ||
      !Array.isArray(items)
    )
      continue;
    const valid = items.flatMap((item) => {
      const element = field.element;
      const parsed = z.safeParse(
        element,
        element instanceof z.ZodType ? omitOptionalNulls(element, item) : item,
      );
      return parsed.success ? [parsed.data] : [];
    });
    if (valid.length !== items.length) codes.add(code.array);
    input[key] = valid;
  }
  return input;
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

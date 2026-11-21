import { z } from "zod";
import type { Meta } from "../../meta";
import type { Definition } from "../../probes";
import type { Affordance, Values } from "../index";

export const moveKey = (item: string) => `${item}/$move`;

type Items = NonNullable<Meta["items"]>;
type EnumMove = Extract<NonNullable<Items["move"]>, { field: string }>;
type Schema = Definition["props"];

function unwrapOptional(schema: unknown): unknown {
  while (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) schema = schema.unwrap();
  return schema;
}

function enumValues(items: Items, spec: EnumMove, schema?: Schema, current?: string): string[] {
  // A defaulted collection can show rows with no editable wire slot.
  const rows = unwrapOptional(schema?.shape[items.key]);
  if (!(rows instanceof z.ZodArray) || !(rows.element instanceof z.ZodObject)) return [];
  const fieldSchema = rows.element.shape[spec.field];
  let field = unwrapOptional(fieldSchema);
  while (field instanceof z.ZodDefault || field instanceof z.ZodPrefault)
    field = unwrapOptional(field.unwrap());
  if (!(field instanceof z.ZodEnum) || !fieldSchema) return [];
  const allowed = new Set(field.options);
  const valid = (value: string) => allowed.has(value) && fieldSchema.safeParse(value).data === value;
  if (current !== undefined && !valid(current)) return [];
  return [...new Set(spec.values)].filter((value) => value !== current && valid(value));
}

const rowsAt = (props: Values, key: string) => (Array.isArray(props[key]) ? (props[key] as Values[]) : []);
const columnLabels = (columns: Values[]) =>
  columns.map((column) => (typeof column?.label === "string" ? column.label : undefined));

function columnAt(value: unknown, labels: ReturnType<typeof columnLabels>, derived: boolean) {
  if (derived && value === null) return null;
  if (typeof value === "number" && Number.isInteger(value) && labels[value] !== undefined) return value;
}

/** A view uses the same destination choices as the reader and dispatcher. */
export function itemMoveOffer(meta: Meta, props: Values, row: Values, schema?: Schema): Affordance["move"] {
  const items = meta.items;
  const spec = items?.move;
  // Moves do not use the position of a host-projected row as a wire slot.
  if (!spec || items.deviceData) return;
  if ("field" in spec) {
    const current = row[spec.field];
    if (typeof current !== "string") return;
    const choices = enumValues(items, spec, schema, current);
    return choices.length ? { current, choices } : undefined;
  }
  const columns = rowsAt(props, spec.columns);
  const labels = columnLabels(columns);
  const current = columnAt(row[spec.column], labels, Boolean(spec.derived));
  if (current === undefined) return;
  const counts = new Map<unknown, number>();
  if (spec.derived)
    for (const item of rowsAt(props, items.key)) {
      const at = item[spec.column];
      counts.set(at, (counts.get(at) ?? 0) + 1);
    }
  // A label is an addressable destination only if it identifies exactly one column.
  const choices = labels.filter((label, index): label is string => {
    if (!label || index === current || labels.indexOf(label) !== labels.lastIndexOf(label)) return false;
    if (!spec.derived) return true;
    const limit = columns[index]?.[spec.capacity];
    return typeof limit === "number" && Number.isInteger(limit) && (counts.get(index) ?? 0) < limit;
  });
  if (choices.length) return { current: current === null ? null : labels[current]!, choices };
}

export function itemActionOffer(
  meta: Meta,
  props: Values,
  row: Values,
  offer: Affordance,
  schema?: Schema,
): Affordance[] {
  const { part, action } = offer;
  // Other declarations (such as moving a guest to a table) keep their existing offer.
  if (action === "move" && meta.items?.move) {
    const move = part === "root" && itemMoveOffer(meta, props, row, schema);
    return move ? [{ ...offer, move }] : [];
  }
  return [offer];
}

/** Overlay the destination on the original wire row without reordering or restamping it. */
export function projectMoves(def: Definition, props: Values, get: (part: string) => unknown): Values {
  const items = def.meta.items;
  const spec = items?.move;
  if (!spec || spec.derived || items.deviceData || !Array.isArray(props[items.key])) return props;
  const rows = props[items.key] as Values[];
  let labels: ReturnType<typeof columnLabels> | undefined;
  let values: Set<string> | undefined;
  const projected = rows.map((row, index) => {
    const value = get(moveKey(`${items.prefix ?? "r"}${index + 1}`));
    if (typeof value !== "string") return row;
    if ("field" in spec) {
      values ??= new Set(enumValues(items, spec, def.props));
      return values.has(value) && value !== row[spec.field] ? { ...row, [spec.field]: value } : row;
    }
    const { columns, column } = spec;
    // Use the same labels as the offer, including the label schema's text normalization.
    labels ??= columnLabels(
      rowsAt({ [columns]: def.props.shape[columns]?.safeParse(props[columns]).data }, columns),
    );
    const at = labels.indexOf(value);
    return at >= 0 && at === labels.lastIndexOf(value) && at !== row[column] ? { ...row, [column]: at } : row;
  });
  return projected.some((row, index) => row !== rows[index]) ? { ...props, [items.key]: projected } : props;
}

/** Move only the stamped derived row, never its wire owner or its position in the addressed list. */
export function projectDerivedMoves(meta: Meta, props: Values, get: (part: string) => unknown): Values {
  const items = meta.items;
  const spec = items?.move;
  if (!items || !spec?.derived || items.deviceData) return props;
  const rows = rowsAt(props, items.key);
  const labels = columnLabels(rowsAt(props, spec.columns));
  const moved = rows.map((row) => {
    const value = typeof row.id === "string" && get(moveKey(row.id));
    if (typeof value !== "string" || columnAt(row[spec.column], labels, true) === undefined) return row;
    const at = labels.indexOf(value);
    return at >= 0 && at === labels.lastIndexOf(value) && at !== row[spec.column]
      ? { ...row, [spec.column]: at }
      : row;
  });
  return moved.some((row, index) => row !== rows[index]) ? { ...props, [items.key]: moved } : props;
}

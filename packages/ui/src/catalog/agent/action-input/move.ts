import { z } from "zod";
import type { Meta } from "../../meta";
import type { Definition } from "../../probes";
import type { Affordance, Values } from "../index";

export const moveKey = (item: string) => `${item}/$move`;

type Items = NonNullable<Meta["items"]>;
type Move = NonNullable<Items["move"]>;
type EnumMove = Extract<Move, { field: string }>;
type Schema = Definition["props"];

function unwrapOptional(schema: unknown): unknown {
  while (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) schema = schema.unwrap();
  return schema;
}

function enumValues(items: Items, spec: EnumMove, schema?: Schema): string[] {
  const rows = unwrapOptional(schema?.shape[items.key]);
  if (!(rows instanceof z.ZodArray) || !(rows.element instanceof z.ZodObject)) return [];
  let field = unwrapOptional(rows.element.shape[spec.field]);
  while (field instanceof z.ZodDefault || field instanceof z.ZodPrefault)
    field = unwrapOptional(field.unwrap());
  if (!(field instanceof z.ZodEnum)) return [];
  const allowed = new Set(field.options);
  return [...new Set(spec.values)].filter((value) => allowed.has(value));
}

function columnLabels(props: Values, key: string): (string | undefined)[] {
  const columns = props[key];
  return Array.isArray(columns)
    ? columns.map((column) => (typeof column?.label === "string" ? column.label : undefined))
    : [];
}

function moveOffer(items: Items, spec: Move, props: Values, row: Values, schema?: Schema) {
  if ("field" in spec) {
    const current = row[spec.field];
    if (typeof current !== "string") return;
    const values = enumValues(items, spec, schema);
    const choices = values.filter((value) => value !== current);
    if (choices.length && values.includes(current)) return { current, choices };
    return;
  }
  const labels = columnLabels(props, spec.columns);
  const current = row[spec.column];
  if (typeof current !== "number" || !Number.isInteger(current) || labels[current] === undefined) return;
  // A label is an addressable destination only if it identifies exactly one column.
  const choices = labels.filter(
    (label, index): label is string =>
      !!label && index !== current && labels.indexOf(label) === labels.lastIndexOf(label),
  );
  if (choices.length) return { current: labels[current], choices };
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
    // Moves write by wire slot, not by the position of a host-projected row.
    if (meta.items.deviceData) return [];
    const move = part === "root" && moveOffer(meta.items, meta.items.move, props, row, schema);
    return move ? [{ ...offer, move }] : [];
  }
  return [offer];
}

/** Overlay the destination on the original wire row without reordering or restamping it. */
export function projectMoves(def: Definition, props: Values, get: (part: string) => unknown): Values {
  const items = def.meta.items;
  if (!items?.move || items.deviceData || !Array.isArray(props[items.key])) return props;
  const spec = items.move;
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
    labels ??= columnLabels({ [columns]: def.props.shape[columns]?.safeParse(props[columns]).data }, columns);
    const at = labels.indexOf(value);
    return at >= 0 && at === labels.lastIndexOf(value) && at !== row[column] ? { ...row, [column]: at } : row;
  });
  return projected.some((row, index) => row !== rows[index]) ? { ...props, [items.key]: projected } : props;
}

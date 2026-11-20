import type { Meta } from "../../meta";
import { choiceValues, type Affordance, type Values } from "../index";

export const moveKey = (item: string) => `${item}/$move`;

function columnLabels(props: Values, key: string): (string | undefined)[] {
  const columns = props[key];
  return Array.isArray(columns)
    ? columns.map((column) => (typeof column?.label === "string" ? column.label : undefined))
    : [];
}

function moveOffer(meta: Meta, props: Values, row: Values) {
  const spec = meta.items?.move;
  if (!spec) return;
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

export function itemActionOffer(meta: Meta, props: Values, row: Values, offer: Affordance): Affordance[] {
  const { part, action } = offer;
  if (action === "move") {
    const move = part === "root" && moveOffer(meta, props, row);
    return move ? [{ ...offer, move }] : [];
  }
  if (
    action === "select" &&
    meta.items?.edits?.[part]?.action === "select" &&
    !choiceValues(meta, props, `${String(row.id)}/${part}`)?.length
  )
    return [];
  return [offer];
}

/** Overlay the column index on the original wire row without reordering or restamping it. */
export function projectMoves(meta: Meta, props: Values, get: (part: string) => unknown): Values {
  const items = meta.items;
  if (!items?.move || !Array.isArray(props[items.key])) return props;
  const { columns, column } = items.move;
  const labels = columnLabels(props, columns);
  const rows = props[items.key] as Values[];
  const projected = rows.map((row, index) => {
    const value = get(moveKey(`${items.prefix ?? "r"}${index + 1}`));
    if (typeof value !== "string") return row;
    const at = labels.indexOf(value);
    return at >= 0 && at === labels.lastIndexOf(value) && at !== row[column] ? { ...row, [column]: at } : row;
  });
  return projected.some((row, index) => row !== rows[index]) ? { ...props, [items.key]: projected } : props;
}

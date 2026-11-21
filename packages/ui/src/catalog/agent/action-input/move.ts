import type { Meta } from "../../meta";
import type { Definition } from "../../probes";
import type { Affordance, Values } from "../index";

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
  // Other declarations (such as moving a guest to a table) keep their existing offer.
  if (action === "move" && meta.items?.move) {
    // Column moves write by wire slot, not by the position of a host-projected row.
    if (meta.items.deviceData) return [];
    const move = part === "root" && moveOffer(meta, props, row);
    return move ? [{ ...offer, move }] : [];
  }
  return [offer];
}

/** Overlay the column index on the original wire row without reordering or restamping it. */
export function projectMoves(def: Definition, props: Values, get: (part: string) => unknown): Values {
  const items = def.meta.items;
  if (!items?.move || items.deviceData || !Array.isArray(props[items.key])) return props;
  const { columns, column } = items.move;
  const rows = props[items.key] as Values[];
  let labels: ReturnType<typeof columnLabels> | undefined;
  const projected = rows.map((row, index) => {
    const value = get(moveKey(`${items.prefix ?? "r"}${index + 1}`));
    if (typeof value !== "string") return row;
    // Use the same labels as the offer, including the label schema's text normalization.
    labels ??= columnLabels({ [columns]: def.props.shape[columns]?.safeParse(props[columns]).data }, columns);
    const at = labels.indexOf(value);
    return at >= 0 && at === labels.lastIndexOf(value) && at !== row[column] ? { ...row, [column]: at } : row;
  });
  return projected.some((row, index) => row !== rows[index]) ? { ...props, [items.key]: projected } : props;
}

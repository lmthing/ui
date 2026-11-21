import type { Meta } from "../../meta";
import type { Definition } from "../../probes";
import type { Affordance, Values } from "../index";

export const moveKey = (item: string) => `${item}/$move`;

const rowsAt = (props: Values, key: string) => (Array.isArray(props[key]) ? (props[key] as Values[]) : []);
const columnLabels = (columns: Values[]) =>
  columns.map((column) => (typeof column?.label === "string" ? column.label : undefined));

function columnAt(value: unknown, labels: ReturnType<typeof columnLabels>, derived: boolean) {
  if (derived && value === null) return null;
  if (typeof value === "number" && Number.isInteger(value) && labels[value] !== undefined) return value;
}

/** A view uses the same destination choices as the reader and dispatcher. */
export function itemMoveOffer(meta: Meta, props: Values, row: Values): Affordance["move"] {
  const items = meta.items;
  const spec = items?.move;
  if (!spec || items.deviceData) return;
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

export function itemActionOffer(meta: Meta, props: Values, row: Values, offer: Affordance): Affordance[] {
  const { part, action } = offer;
  // Other declarations (such as moving a guest to a table) keep their existing offer.
  if (action === "move" && meta.items?.move) {
    const move = part === "root" && itemMoveOffer(meta, props, row);
    return move ? [{ ...offer, move }] : [];
  }
  return [offer];
}

/** Overlay the column index on the original wire row without reordering or restamping it. */
export function projectMoves(def: Definition, props: Values, get: (part: string) => unknown): Values {
  const items = def.meta.items;
  if (!items?.move || items.move.derived || items.deviceData || !Array.isArray(props[items.key]))
    return props;
  const { columns, column } = items.move;
  const rows = props[items.key] as Values[];
  let labels: ReturnType<typeof columnLabels> | undefined;
  const projected = rows.map((row, index) => {
    const value = get(moveKey(`${items.prefix ?? "r"}${index + 1}`));
    if (typeof value !== "string") return row;
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

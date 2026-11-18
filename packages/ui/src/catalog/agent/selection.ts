import type { Meta } from "../meta";
import type { Values } from "./act";

const rowsOf = (meta: Meta, props: Values): Values[] =>
  meta.items?.key && Array.isArray(props[meta.items.key]) ? (props[meta.items.key] as Values[]) : [];
const idOf = (meta: Meta, row: Values, index: number) =>
  String(row.id ?? `${meta.items?.prefix ?? "r"}${index + 1}`);

/** Resolve a row or a fixed part without knowing which component owns it. */
export function selectionAt(meta: Meta, props: Values, target: string) {
  const select = meta.select;
  if (!select) return undefined;
  if (Object.hasOwn(select.parts ?? {}, target)) return { value: select.parts![target] };
  const rows = rowsOf(meta, props);
  const index = rows.findIndex((row, at) => idOf(meta, row, at) === target.split("/")[0]);
  const row = rows[index];
  if (!row) return undefined;
  const value =
    select.value === "index" ? index : select.value === "position" ? index + 1 : row[select.value.field];
  return { value, index, row };
}

export function selectionError(meta: Meta, props: Values, target: string, value: unknown) {
  const found = selectionAt(meta, props, target);
  if (!found || found.value === undefined) return "No option at this address";
  if (value === undefined || value === found.value) return undefined;
  if (found.row) {
    const label = found.row.label ?? found.row.title ?? found.row.day;
    if (value === label || (meta.select?.value !== "position" && value === found.index)) return undefined;
  }
  return "Select the option at this address";
}

/** Keep only the current selection's action value, so repeated reads cannot show stale choices. */
export function selectionChanges(meta: Meta, props: Values, target: string): Values {
  const select = meta.select;
  const found = selectionAt(meta, props, target);
  if (!select || !found) return {};
  const values: Values = {};
  rowsOf(meta, props).forEach((row, index) => {
    const id = idOf(meta, row, index);
    if (select.mode === "flags") values[id] = index === found.index;
    else
      Object.entries(meta.actions?.items ?? {}).forEach(([part, actions]) => {
        if (actions.includes("select")) values[part === "root" ? id : `${id}/${part}`] = undefined;
      });
  });
  Object.keys(select.parts ?? {}).forEach((part) => {
    values[part] = undefined;
  });
  if (select.mode !== "flags") {
    values[`$${select.prop}`] = found.value;
    values[select.prop] = found.value;
    values[target] = found.value;
  }
  return values;
}

/** Flags belong to rows; single selections belong to the declared component prop. */
export function projectSelection(meta: Meta, props: Values, get: (part: string) => unknown): Values {
  const select = meta.select;
  if (!select) return props;
  if (select.mode === "flags" && meta.items?.key)
    return {
      ...props,
      [meta.items.key]: rowsOf(meta, props).map((row, index) => ({
        ...row,
        [select.prop]: get(idOf(meta, row, index)) ?? row[select.prop] ?? false,
      })),
    };
  const value = get(`$${select.prop}`);
  return value === undefined ? props : { ...props, [select.prop]: value };
}

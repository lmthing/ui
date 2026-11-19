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

/** Enumerate controls from real sub-items, never from a fixed maximum count. */
export function nestedControls(meta: Meta, props: Values) {
  const nested = meta.items?.nested;
  if (!nested) return [];
  return rowsOf(meta, props).flatMap((row, index) => {
    const id = idOf(meta, row, index);
    const children = row[nested.key];
    if (!Array.isArray(children)) return [];
    return (children as Values[]).flatMap((item, at) =>
      Object.entries(nested.parts).map(([name, spec]) => ({
        target: `${id}/${name}_${at + 1}`,
        part: `${name}_${at + 1}`,
        spec,
        item,
        enabled: !spec.when || item[nested.parts[spec.when]?.prop ?? ""] === true,
      })),
    );
  });
}

export function nestedAt(meta: Meta, props: Values, target: string) {
  return nestedControls(meta, props).find((control) => control.target === target);
}

/** Keep wire data immutable while replacing only declared sub-item props. */
export function projectNested(meta: Meta, props: Values, get: (part: string) => unknown): Values {
  const items = meta.items;
  const nested = items?.nested;
  if (!items || !nested || !Array.isArray(props[items.key])) return props;
  return {
    ...props,
    [items.key]: rowsOf(meta, props).map((row, index) => {
      if (!Array.isArray(row[nested.key])) return row;
      const id = idOf(meta, row, index);
      return {
        ...row,
        [nested.key]: (row[nested.key] as Values[]).map((item, at) => {
          const next = { ...item };
          for (const [part, spec] of Object.entries(nested.parts)) {
            const value = get(`${id}/${part}_${at + 1}`);
            if (value !== undefined) next[spec.prop] = value;
          }
          return next;
        }),
      };
    }),
  };
}

import type { Meta } from "../meta";
import type { Values } from "./act";
import { validateActionValue } from "./validate-value";

const rowsOf = (meta: Meta, props: Values): Values[] =>
  meta.items?.key && Array.isArray(props[meta.items.key]) ? (props[meta.items.key] as Values[]) : [];
const idOf = (meta: Meta, row: Values, index: number) =>
  String(row.id ?? `${meta.items?.prefix ?? "r"}${index + 1}`);

/** Undefined means a legacy selection; an empty list means there are no offered choices. */
export function choiceValues(meta: Meta, props: Values, target: string): unknown[] | undefined {
  const choices = meta.select?.choices;
  if (!choices || !Object.hasOwn(choices, target)) return undefined;
  const source = choices[target]!;
  const allowed = "prop" in source ? props[source.prop] : source;
  return Array.isArray(allowed) ? allowed.filter((value) => !validateActionValue("select", value)) : [];
}

/** Resolve a row or a named part without knowing which component owns it. */
export function selectionAt(meta: Meta, props: Values, target: string, explicit?: unknown) {
  const select = meta.select;
  if (!select) return undefined;
  const choices = choiceValues(meta, props, target);
  if (choices) return choices.includes(explicit) ? { value: explicit } : undefined;
  if (Object.hasOwn(select.parts ?? {}, target)) return { value: select.parts![target] };
  if (!select.value) return undefined;
  const rows = rowsOf(meta, props);
  const index = rows.findIndex((row, at) => idOf(meta, row, at) === target.split("/")[0]);
  const row = rows[index];
  if (!row) return undefined;
  const value =
    select.value === "index" ? index : select.value === "position" ? index + 1 : row[select.value.field];
  return { value, index, row };
}

export function selectionError(meta: Meta, props: Values, target: string, value: unknown) {
  const found = selectionAt(meta, props, target, value);
  if (Object.hasOwn(meta.select?.choices ?? {}, target))
    return found ? undefined : "Select an allowed value at this address";
  if (!found || found.value === undefined) return "No option at this address";
  if (value === undefined || value === found.value) return undefined;
  if (found.row) {
    const label = found.row.label ?? found.row.title ?? found.row.day;
    if (value === label || (meta.select?.value !== "position" && value === found.index)) return undefined;
  }
  return "Select the option at this address";
}

/** Keep only the current selection's action value, so repeated reads cannot show stale choices. */
export function selectionChanges(meta: Meta, props: Values, target: string, explicit?: unknown): Values {
  const select = meta.select;
  const found = selectionAt(meta, props, target, explicit);
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
  [...Object.keys(select.parts ?? {}), ...Object.keys(select.choices ?? {})].forEach((part) => {
    values[part] = undefined;
  });
  if (select.mode !== "flags") {
    values[`$${select.prop}`] = found.value;
    if (!Object.hasOwn(select.choices ?? {}, target)) values[select.prop] = found.value;
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
        enabled:
          typeof spec.when === "object"
            ? item[spec.when.prop] === spec.when.equals
            : !spec.when || item[nested.parts[spec.when]?.prop ?? ""] === true,
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
      const children = row[nested.key] as Values[];
      const projected = children.map((item, at) => {
        let next = item;
        for (const [part, spec] of Object.entries(nested.parts)) {
          const value = get(`${id}/${part}_${at + 1}`);
          if (value !== undefined && value !== next[spec.prop]) next = { ...next, [spec.prop]: value };
        }
        return next;
      });
      return projected.some((child, at) => child !== children[at])
        ? { ...row, [nested.key]: projected }
        : row;
    }),
  };
}

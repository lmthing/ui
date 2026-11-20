import type { Meta } from "../meta";
import type { Values } from "./act";
import { choiceOptions, resolveChoice, selectionOffer } from "./validate-value";
import { projectNamedSelections } from "./live-inputs";

type GetValue = (part: string) => unknown;
const parentSlot = "$nested/parent";
const rowsOf = (meta: Meta, props: Values): Values[] =>
  meta.items?.key && Array.isArray(props[meta.items.key]) ? (props[meta.items.key] as Values[]) : [];
const idOf = (meta: Meta, row: Values, index: number) =>
  String(row.id ?? `${meta.items?.prefix ?? "r"}${index + 1}`);
const rowValue = (value: NonNullable<NonNullable<Meta["select"]>["value"]>, row: Values, index: number) =>
  value === "index" ? index : value === "position" ? index + 1 : row[value.field];

/** Resolve a row or a named part without knowing which component owns it. */
export function selectionAt(meta: Meta, props: Values, target: string, explicit?: unknown) {
  const choices = choiceOptions(meta, props, target);
  if (choices) return resolveChoice(choices, explicit);
  const select = meta.select;
  if (!select) return undefined;
  if (Object.hasOwn(select.parts ?? {}, target)) return { value: select.parts![target] };
  if (!select.value) return undefined;
  const rows = rowsOf(meta, props);
  const index = rows.findIndex((row, at) => idOf(meta, row, at) === target.split("/")[0]);
  const row = rows[index];
  if (!row) return undefined;
  return { value: rowValue(select.value, row, index), index, row };
}

export function selectionError(meta: Meta, props: Values, target: string, value: unknown) {
  const found = selectionAt(meta, props, target, value);
  if (selectionOffer(meta, target)) return found ? undefined : "Select an allowed value at this address";
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
  if (!found) return {};
  const named = Object.hasOwn(meta.selections ?? {}, target) && meta.selections![target]!;
  if (named)
    return {
      [target]: found.value,
      [named.runtime ? `$selection/${named.prop}` : `$${named.prop}`]: found.value,
    };
  if (!select) return {};
  const values: Values = {};
  rowsOf(meta, props).forEach((row, index) => {
    const id = idOf(meta, row, index);
    if (select.mode === "flags") values[id] = index === found.index;
    else
      Object.entries(meta.actions?.items ?? {}).forEach(([part, actions]) => {
        if (actions.includes("select") && meta.items?.edits?.[part]?.action !== "select")
          values[part === "root" ? id : `${id}/${part}`] = undefined;
      });
  });
  [...Object.keys(select.parts ?? {}), ...Object.keys(select.choices ?? {})].forEach((part) => {
    if (!Object.hasOwn(meta.selections ?? {}, part)) values[part] = undefined;
  });
  if (select.mode !== "flags") {
    if (meta.items?.nested?.activeParent)
      values[parentSlot] = found.row ? idOf(meta, found.row, found.index) : undefined;
    values[`$${select.prop}`] = found.value;
    if (!Object.hasOwn(select.choices ?? {}, target)) values[select.prop] = found.value;
    values[target] = found.value;
  }
  return values;
}

/** Flags belong to rows; single selections belong to the declared component prop. */
export function projectLegacySelection(meta: Meta, props: Values, get: GetValue): Values {
  const select = meta.select;
  if (!select) return props;
  if (select.mode === "flags" && meta.items?.key) {
    const rows = rowsOf(meta, props).map((row, index) => ({
      ...row,
      [select.prop]: get(idOf(meta, row, index)) ?? row[select.prop] ?? false,
    }));
    return { ...props, [meta.items.key]: rows };
  }
  const value = get(`$${select.prop}`);
  return value === undefined ? props : { ...props, [select.prop]: value };
}

export function projectSelection(meta: Meta, props: Values, get: GetValue): Values {
  return projectNamedSelections(meta, projectLegacySelection(meta, props, get), get, "wire");
}

/** Resolve the visible parent from projected props, without removing or renumbering any rows. */
export function activeParentId(meta: Meta, props: Values, get?: GetValue): string | undefined {
  if (!meta.items?.nested?.activeParent) return undefined;
  const rows = rowsOf(meta, props);
  const select = meta.select;
  const value = select?.value;
  let index = 0;
  if (select?.mode === "flags")
    index = Math.max(
      0,
      rows.findIndex((row) => row[select.prop] === true),
    );
  else if (select && value && props[select.prop] !== undefined) {
    const matches = (row: Values, at: number) => rowValue(value, row, at) === props[select.prop];
    const saved = get?.(parentSlot);
    const selected = rows.findIndex((row, at) => idOf(meta, row, at) === saved && matches(row, at));
    index = selected < 0 ? rows.findIndex(matches) : selected;
  }
  const row = rows[index];
  return row && idOf(meta, row, index);
}

export function isNestedTarget(meta: Meta, target: string): boolean {
  const [row, part, extra] = target.split("/");
  const name = part?.match(/^(.+)_[1-9]\d*$/)?.[1];
  return Boolean(row && name && extra === undefined && Object.hasOwn(meta.items?.nested?.parts ?? {}, name));
}

/** Enumerate controls from real sub-items, never from a fixed maximum count. */
export function nestedControls(meta: Meta, props: Values, get?: GetValue) {
  const nested = meta.items?.nested;
  if (!nested) return [];
  const activeParent = activeParentId(meta, props, get);
  const parts = Object.entries(nested.parts);
  return rowsOf(meta, props).flatMap((row, index) => {
    const id = idOf(meta, row, index);
    const children = row[nested.key];
    if (!Array.isArray(children)) return [];
    return (children as Values[]).flatMap((item, at) =>
      parts.map(([name, spec]) => {
        const part = `${name}_${at + 1}`;
        const when = spec.when;
        const matches =
          typeof when === "object"
            ? item[when.prop] === when.equals
            : !when || item[nested.parts[when]?.prop ?? ""] === true;
        const peers =
          nested.maxActive !== undefined && spec.action === "toggle"
            ? parts.filter(([, peer]) => peer.action === "toggle" && peer.prop === spec.prop)
            : undefined;
        const togglePeers = peers?.map(([peer]) => `${id}/${peer}_${at + 1}`);
        const enabled = (!nested.activeParent || id === activeParent) && matches;
        return { target: `${id}/${part}`, part, spec, item, togglePeers, enabled };
      }),
    );
  });
}

export function nestedRemaining(meta: Meta, props: Values, controls = nestedControls(meta, props)) {
  const limit = meta.items?.nested?.maxActive;
  if (limit === undefined) return undefined;
  const on = controls.filter(({ spec, item }) => spec.action === "toggle" && item[spec.prop] === true);
  return Math.max(0, limit - on.length);
}

/** Keep inactive children out of read callbacks, but never discard them from live state. */
export function visibleNestedProps(meta: Meta, props: Values, get: GetValue): Values {
  const items = meta.items;
  if (!items?.nested?.activeParent) return props;
  const { key } = items.nested;
  const active = activeParentId(meta, props, get);
  const rows = rowsOf(meta, props).map((row, index) =>
    idOf(meta, row, index) === active || !Array.isArray(row[key]) ? row : { ...row, [key]: [] },
  );
  return { ...props, [items.key]: rows };
}

export function nestedAt(meta: Meta, props: Values, target: string) {
  return nestedControls(meta, props).find((control) => control.target === target);
}

/** Keep wire data immutable while replacing only declared sub-item props. */
export function projectNested(meta: Meta, props: Values, get: GetValue): Values {
  const items = meta.items;
  const nested = items?.nested;
  if (!items || !nested || !Array.isArray(props[items.key])) return props;
  const rows = rowsOf(meta, props).map((row, index) => {
    const children = row[nested.key];
    if (!Array.isArray(children)) return row;
    const id = idOf(meta, row, index);
    const projected = (children as Values[]).map((item, at) => {
      for (const [part, spec] of Object.entries(nested.parts)) {
        const value = get(`${id}/${part}_${at + 1}`);
        if (value !== undefined && value !== item[spec.prop]) item = { ...item, [spec.prop]: value };
      }
      return item;
    });
    return projected.some((child, at) => child !== children[at]) ? { ...row, [nested.key]: projected } : row;
  });
  return { ...props, [items.key]: rows };
}

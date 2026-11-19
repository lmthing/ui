import type { Meta } from "../meta";
import type { Values } from "./act";
import { projectNested, projectSelection } from "./selection";
import { projectAdjustments, projectClocks } from "./clocks";

// A part can offer other actions; only a validated `set` projects into the numeric prop.
export const setKey = (part: string) => `$set/${part}`;

/** Shared schema-prop projection for the planner, reader and kit screen. */
export function projectControls(meta: Meta, props: Values, get: (part: string) => unknown): Values {
  const projected = projectNested(meta, projectSelection(meta, props, get), get);
  const sets = Object.entries(meta.set ?? {}).flatMap(([part, { prop }]) => {
    const value = get(setKey(part));
    return value === undefined ? [] : [[prop, value] as const];
  });
  return sets.length ? { ...projected, ...Object.fromEntries(sets) } : projected;
}

/** Runtime-only presentation keeps the validated wire data and stable item ids intact. */
export function liveProps(meta: Meta, props: Values, instance: string, values: Values): Values {
  const get = (part: string) => values[`${instance}/${part}`];
  props = projectControls(meta, props, get);
  if (values[`${instance}/$runtime`])
    props = projectClocks(meta, projectAdjustments(meta, props, get), get, Number(get("$now") ?? Date.now()));
  if (values[`${instance}/$runtime`]) {
    if (meta.id === "Counter" && Number(props.value) < Number(props.step ?? 1))
      props = { ...props, minus: undefined };
  }
  if (meta.id === "Field" || meta.id === "Search") {
    const value = values[`${instance}/field/$draft`] ?? values[`${instance}/field`];
    if (value !== undefined && props.kind !== "repeat" && props.kind !== "photo")
      props = { ...props, value: String(value) };
  }
  const key = meta.items?.key;
  if (!key || !Array.isArray(props[key])) return props;
  let items = props[key] as Values[];
  if (meta.items?.visible === "first") items = items.slice(Number(values[`${instance}/$cursor`] ?? 0));
  if (meta.id === "List" && props.style === "expand")
    items = items.map((item) =>
      values[`${instance}/${String(item.id)}`] === false ? { ...item, body: undefined } : item,
    );
  return { ...props, [key]: items };
}

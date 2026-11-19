import type { Meta } from "../meta";
import type { Definition } from "../probes";
import { stampItemIds } from "../lines";
import type { Values } from "./act";
import { projectNested, projectSelection } from "./selection";
import { projectAdjustments, projectClocks, projectComponentSets } from "./clocks";

/** Copy only schema-owned control fields to the wire, seeding omitted arrays from parsed defaults. */
export function projectControlInput(
  def: Definition,
  input: Values,
  parsed: Values,
  get: (part: string) => unknown,
): Values {
  const { meta } = def;
  let source = projectComponentSets(meta, input, get);
  if (meta.select?.choices) source = projectSelection(meta, source, get);
  const items = meta.items;
  if (!items?.set) return source;
  const shape = "shape" in def.props ? def.props.shape : undefined;
  const keys = new Set<string>();
  if (
    Object.hasOwn(input, items.key) ||
    (shape && typeof shape === "object" && Object.hasOwn(shape, items.key))
  )
    keys.add(items.key);
  for (const { matrix } of Object.values(items.set)) if (matrix) keys.add(matrix.rows);
  if (!keys.size) return source;
  const seeded = Object.fromEntries([...keys].map((key) => [key, source[key] ?? parsed[key]]));
  const projected = projectAdjustments(meta, seeded, get);
  for (const key of keys) {
    if (projected[key] !== undefined && projected[key] !== source[key])
      source = { ...source, [key]: projected[key] };
  }
  return source;
}

/** Recompute derived props from the wire after applying staged edits, never from draft input. */
export function parseControlProps(def: Definition, input: unknown, get: (part: string) => unknown): Values {
  const parsed = def.props.parse(input) as Values;
  const projected = projectControlInput(def, input as Values, parsed, get);
  return stampItemIds(def.meta, projected === input ? parsed : (def.props.parse(projected) as Values));
}

/** Shared schema-prop projection for the planner, reader and kit screen. */
export function projectControls(meta: Meta, props: Values, get: (part: string) => unknown): Values {
  const projected = projectNested(meta, projectSelection(meta, props, get), get);
  return projectComponentSets(meta, projected, get);
}

/** Runtime-only presentation keeps the validated wire data and stable item ids intact. */
export function liveProps(meta: Meta, props: Values, instance: string, values: Values): Values {
  const get = (part: string) => values[`${instance}/${part}`];
  props = projectControls(meta, props, get);
  if (meta.items?.set || values[`${instance}/$runtime`]) props = projectAdjustments(meta, props, get);
  if (values[`${instance}/$runtime`])
    props = projectClocks(meta, props, get, Number(get("$now") ?? Date.now()));
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

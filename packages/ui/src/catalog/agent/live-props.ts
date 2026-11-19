import { z } from "zod";
import type { Meta } from "../meta";
import type { Definition } from "../probes";
import { stampItemIds } from "../lines";
import type { Values } from "./act";
import { projectNested, projectSelection } from "./selection";
import { projectAdjustments, projectClocks, projectComponentSets } from "./clocks";

function wireSeed(def: Definition, key: string, input: Values): unknown {
  if (input[key] !== undefined) return input[key];
  let field = def.props instanceof z.ZodObject ? def.props.shape[key] : undefined;
  while (field instanceof z.ZodOptional || field instanceof z.ZodNullable) field = field.unwrap();
  return field instanceof z.ZodDefault || field instanceof z.ZodPrefault ? field.def.defaultValue : undefined;
}

/** Apply stored control edits to wire input, never copying schema-derived output into it. */
export function projectControlInput(def: Definition, input: Values, get: (part: string) => unknown): Values {
  const { meta } = def;
  let source = projectComponentSets(meta, input, get);
  if (meta.select?.choices) source = projectSelection(meta, source, get);
  const items = meta.items;
  if (!items || (!items.set && !(items.nested && (meta.select || meta.set)))) return source;
  const keys = new Set([items.key]);
  for (const { matrix } of Object.values(items.set ?? {})) if (matrix) keys.add(matrix.rows);
  const seeded = Object.fromEntries([...keys].map((key) => [key, wireSeed(def, key, source)]));
  const nested = projectNested(meta, seeded, get);
  const projected = items.set ? projectAdjustments(meta, nested, get) : nested;
  for (const key of keys) {
    const next = projected[key],
      seed = seeded[key];
    if (Array.isArray(next) && Array.isArray(seed) && next.some((row, index) => row !== seed[index]))
      source = { ...source, [key]: next };
  }
  return source;
}

/** Recompute derived props from the wire after applying staged edits, never from draft input. */
export function parseControlProps(def: Definition, input: unknown, get: (part: string) => unknown): Values {
  const source =
    input && typeof input === "object" && !Array.isArray(input)
      ? projectControlInput(def, input as Values, get)
      : input;
  return stampItemIds(def.meta, def.props.parse(source) as Values);
}

/** Shared schema-prop projection for the planner, reader and kit screen. */
export function projectControls(meta: Meta, props: Values, get: (part: string) => unknown): Values {
  const projected = projectNested(meta, projectSelection(meta, props, get), get);
  return projectComponentSets(meta, projected, get);
}

/** Preserve parsed values for component setters already applied to the wire. */
export function projectParsedControls(
  meta: Meta,
  props: Values,
  get: (part: string) => unknown,
  runtime: boolean,
): Values {
  const selected = meta.select?.choices ? props : projectSelection(meta, props, get);
  const nested = projectNested(meta, selected, get);
  return runtime || meta.items?.set ? projectAdjustments(meta, nested, get) : nested;
}

/** Runtime-only presentation keeps the validated wire data and stable item ids intact. */
export function liveProps(
  meta: Meta,
  props: Values,
  instance: string,
  values: Values,
  wireApplied = false,
): Values {
  const get = (part: string) => values[`${instance}/${part}`];
  const runtime = Boolean(get("$runtime"));
  if (wireApplied) props = projectParsedControls(meta, props, get, runtime);
  else {
    props = projectControls(meta, props, get);
    if (meta.items?.set || runtime) props = projectAdjustments(meta, props, get);
  }
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

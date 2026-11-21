import { z } from "zod";
import type { Meta } from "../meta";
import type { Definition } from "../probes";
import { stampItemIds } from "../lines";
import { repairVariants } from "../rules";
import type { DeviceData, ScreenLike, Values } from "./index";
import { projectDeviceFlags, projectDeviceRows } from "./device-data";
import { isAdjustOnlyItem } from "./affordances";
import { projectDraw } from "./draw";
import { projectBuzz } from "./buzz";
import { projectLiveInputs, projectNamedSelections } from "./live-inputs";
import { projectLegacySelection, projectNested, projectSelection } from "./selection";
import { applyRecordWire, applyReportEdits, projectRecordIds } from "./report-edits";
import { projectDerivedMoves, projectMoves } from "./action-input";
import { projectRecordRuntime } from "./record-runtime";
import {
  adjustmentAt,
  projectAdjustments,
  projectComponentSets,
  projectLiveClocks,
  projectMatrix,
} from "./clocks";
type Get = (part: string) => unknown;
function unwrapField(field: unknown, wire = false): unknown {
  while (
    field instanceof z.ZodOptional ||
    field instanceof z.ZodNullable ||
    field instanceof z.ZodDefault ||
    field instanceof z.ZodPrefault
  )
    field = field.unwrap();
  if (wire && field instanceof z.ZodPipe) return unwrapField(field.in, true);
  return field;
}
function defaultInput(field: unknown) {
  while (field instanceof z.ZodOptional || field instanceof z.ZodNullable) field = field.unwrap();
  return field instanceof z.ZodDefault || field instanceof z.ZodPrefault ? field.def.defaultValue : undefined;
}
const fieldOf = (schema: unknown, key: string) =>
  schema instanceof z.ZodObject ? schema.shape[key] : undefined;
function wireAdjustmentKey(def: Definition, key: string) {
  const rows = unwrapField(fieldOf(def.props, def.meta.items!.key));
  if (rows instanceof z.ZodPipe) return; // A collection transform can change stamped row positions.
  const prop = key.slice(key.lastIndexOf("/") + 1);
  return rows instanceof z.ZodArray && fieldOf(unwrapField(rows.element, true), prop) ? `$wire/${key}` : key;
}
function projectWireAdjustments(def: Definition, input: Values, get: (part: string) => unknown): Values {
  const items = def.meta.items;
  if (!items?.adjust || !Array.isArray(input[items.key])) return input;
  return {
    ...input,
    [items.key]: (input[items.key] as Values[]).map((row, index) => {
      const id = `${items.prefix ?? "r"}${index + 1}`;
      for (const spec of Object.values(items.adjust ?? {})) {
        if (!spec) continue;
        const value = get(`$wire/${id}/$adjust/${spec.prop}`);
        if (typeof value === "number" && value !== row[spec.prop]) row = { ...row, [spec.prop]: value };
      }
      return row;
    }),
  };
}
/** Wire-backed edits go through schema parsing; derived-only rows are overlaid after parsing. */
export function controlValueKey(def: Definition, key: string): string {
  const items = def.meta.items;
  if (!items?.set || !key.includes("/$adjust/")) return key;
  const wireRows = fieldOf(def.props, items.key);
  return Object.values(items.set).some(
    ({ prop, matrix }) => (wireRows || matrix) && key.endsWith(`/$adjust/${prop}`),
  )
    ? `$wire/${key}`
    : key;
}
/** Apply stored control edits to wire input, never copying schema-derived output into it. */
export function projectControlInput(def: Definition, input: Values, get: (part: string) => unknown): Values {
  const { meta } = def;
  let source = projectComponentSets(meta, applyReportEdits(meta, input, get), get);
  if (meta.select?.choices) source = projectLegacySelection(meta, source, get);
  source = projectNamedSelections(meta, source, get, "wire");
  source = applyRecordWire(meta, source, get);
  source = projectMoves(def, source, get);
  const items = meta.items;
  if (!items || (!items.set && !items.adjust && !(items.nested && (meta.select || meta.set)))) return source;
  const keys = new Set([items.key]);
  for (const { matrix } of Object.values(items.set ?? {})) if (matrix) keys.add(matrix.rows);
  const seeded = Object.fromEntries(
    [...keys].map((key) => [key, source[key] ?? defaultInput(fieldOf(def.props, key))]),
  );
  const nested = projectNested(meta, seeded, get);
  const wireGet = (part: string) => get(controlValueKey(def, part));
  const adjusted = projectWireAdjustments(def, nested, get);
  const projected = items.set
    ? projectMatrix(meta, projectAdjustments(meta, adjusted, wireGet), wireGet, (rows, values) => {
        const array = unwrapField(fieldOf(def.props, rows));
        return array instanceof z.ZodArray
          ? defaultInput(fieldOf(unwrapField(array.element), values))
          : undefined;
      })
    : adjusted;
  for (const key of keys) {
    const next = projected[key],
      seed = seeded[key];
    if (Array.isArray(next) && Array.isArray(seed) && next.some((row, index) => row !== seed[index]))
      source = { ...source, [key]: next };
  }
  return source;
}
/** Recompute derived props from the wire after applying staged edits, never from draft input. */
export function parseControlProps(def: Definition, input: unknown, get?: (part: string) => unknown): Values {
  const repaired = repairVariants(def, input).props;
  const source =
    get && repaired && typeof repaired === "object" && !Array.isArray(repaired)
      ? projectControlInput(def, repaired as Values, get)
      : repaired;
  return stampItemIds(def.meta, def.props.parse(source) as Values);
}
/** Keep runtime-only selection flags out of the kit screen's wire projection. */
export function projectControls(meta: Meta, props: Values, get: Get, mode?: "live" | "wire"): Values {
  return projectComponentSets(meta, projectNested(meta, projectSelection(meta, props, get, mode), get), get);
}
/** Preserve parsed values for component setters already applied to the wire. */
export function projectParsedControls(meta: Meta, props: Values, get: Get, runtime: boolean): Values {
  const selected = meta.select?.choices ? props : projectLegacySelection(meta, props, get);
  const nested = projectNested(meta, selected, get);
  return runtime || meta.items?.set || meta.items?.adjust ? projectAdjustments(meta, nested, get) : nested;
}
/** Runtime-only presentation keeps the validated wire data and stable item ids intact. */
export function liveProps(
  meta: Meta,
  validated: Values,
  instance: string,
  values: Values,
  wireApplied = false,
  data?: DeviceData,
  now?: number,
): Values {
  const get = (part: string) => values[`${instance}/${part}`];
  const moved = projectDerivedMoves(meta, validated, get);
  const addressed = projectRecordIds(meta, projectDeviceRows(meta, moved, data), get);
  const { draw, emptyActions, errorActions, successActions, session } = meta;
  const runtime = Boolean(get("$runtime"));
  let props = wireApplied
    ? projectParsedControls(meta, addressed, get, runtime)
    : projectControls(meta, addressed, get);
  if (!wireApplied && (meta.items?.set || meta.items?.adjust || runtime))
    props = projectAdjustments(meta, props, get);
  const timed = projectLiveClocks(meta, props, get, runtime || !!(meta.live || meta.recordRuntime?.actions));
  if (timed !== props) props = timed;
  else if (draw || emptyActions?.length || errorActions?.length || successActions?.length || session) {
    const state = get("$state");
    if (state !== undefined) props = { ...props, state };
  }
  props = projectBuzz(meta, projectDraw(meta, props, get), get);
  props = projectLiveInputs(meta, props, instance, get, data, validated);
  props = projectRecordRuntime(meta, props, instance, values, data, now);
  // Reapply to rows that a live or host projection may have replaced.
  if (meta.select?.runtime) props = projectLegacySelection(meta, props, get);
  props = projectDeviceFlags(meta, props, data);
  if (runtime && meta.id === "Counter" && Number(props.value) < Number(props.step ?? 1))
    props = { ...props, minus: undefined };
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
export function stageItemAdjustment(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  address: string,
  action: string,
  values: Values,
): boolean | undefined {
  if (action !== "increment" && action !== "decrement") return;
  const [id, ...parts] = address.split("/");
  const entry = screen.components.find((item) => item.id === id);
  const def = entry && defs[entry.c];
  if (!entry || !def?.meta.items?.adjust) return;
  const { id: _id, c: _c, state: _state, ...raw } = entry;
  const base = `${screen.id}/${id}`;
  const get = (part: string) => values[`${base}/${part}`];
  const props = parseControlProps(def, raw, get);
  const now = Number(get("$now") ?? Date.now());
  const adjustment = adjustmentAt(def.meta, props, parts.join("/"), action, get, now);
  if (!isAdjustOnlyItem(adjustment, action)) return;
  const slot = wireAdjustmentKey(def, adjustment.key);
  if (adjustment.next === undefined || !slot) return false;
  values[`${base}/${slot}`] = adjustment.next;
  values[`${screen.id}/${address}`] = adjustment.next;
  return true;
}

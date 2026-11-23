import { z } from "zod";
import type { Meta } from "../meta";
import type { Definition } from "../probes";
import { hostItemInput, hostWireItemIds, parseItemProps } from "../lines";
import { repairVariants } from "../rules";
import type { DeviceData, Values } from "./index";
import { projectDeviceFlags, projectDeviceRows } from "./device-data";
import { projectDraw } from "./draw";
import { projectBuzz } from "./buzz";
import { projectLiveInputs, projectLocalState, projectNamedSelections } from "./live-inputs";
import { projectLegacySelection, projectNested, projectSelection } from "./selection";
import { applyRecordWire, applyReportEdits, projectRecordIds } from "./report-edits";
import { projectCollections, projectDerivedMoves, projectMoves } from "./collections";
import { hasWireNestedControls, nestedChoiceSeed } from "./nested";
import { dateSpanKey, projectDateSpan } from "./date-span";
import { projectSequence } from "./media";
import { projectRecordRuntime } from "./record-runtime";
import {
  hasLiveAdjustments,
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
export function wireAdjustmentKey(def: Definition, key: string) {
  const rows = unwrapField(fieldOf(def.props, def.meta.items!.key));
  if (rows instanceof z.ZodPipe) return; // A collection transform can change stamped row positions.
  const prop = key.slice(key.lastIndexOf("/") + 1);
  return rows instanceof z.ZodArray && fieldOf(unwrapField(rows.element, true), prop) ? `$wire/${key}` : key;
}
function projectWireAdjustments(
  def: Definition,
  input: Values,
  get: (part: string) => unknown,
  ids?: readonly (string | undefined)[],
): Values {
  const items = def.meta.items;
  if (!items?.adjust || !Array.isArray(input[items.key])) return input;
  return {
    ...input,
    [items.key]: (input[items.key] as Values[]).map((row, index) => {
      const id = ids?.[index] ?? `${items.prefix ?? "r"}${index + 1}`;
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
export function projectControlInput(def: Definition, input: Values, get: Get): Values {
  const { meta } = def;
  let source = projectComponentSets(meta, applyReportEdits(meta, input, get), get);
  if (meta.select?.choices) source = projectLegacySelection(meta, source, get, hostWireItemIds(def, source));
  source = projectNamedSelections(meta, source, get, "wire");
  source = applyRecordWire(meta, source, get);
  const ids = hostWireItemIds(def, source);
  source = projectMoves(def, source, get, ids);
  const items = meta.items;
  if (!items || (!items.set && !items.adjust && !hasWireNestedControls(meta))) return source;
  const keys = new Set([items.key]);
  for (const { matrix } of Object.values(items.set ?? {})) if (matrix) keys.add(matrix.rows);
  const seeded = Object.fromEntries(
    [...keys].map((key) => [key, source[key] ?? defaultInput(fieldOf(def.props, key))]),
  );
  const choiceSeed = nestedChoiceSeed(meta, def.props, hostItemInput(def, source).wire);
  const nested = projectNested(meta, seeded, get, choiceSeed, ids);
  const wireGet = (part: string) => get(controlValueKey(def, part));
  const adjusted = projectWireAdjustments(def, nested, get, ids);
  const projected = items.set
    ? projectMatrix(
        meta,
        projectAdjustments(meta, adjusted, wireGet, true, ids),
        wireGet,
        (rows, values) => {
          const array = unwrapField(fieldOf(def.props, rows));
          return array instanceof z.ZodArray
            ? defaultInput(fieldOf(unwrapField(array.element), values))
            : undefined;
        },
        ids,
      )
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
  return parseItemProps(def, source);
}
/** Keep runtime-only selection flags out of the kit screen's wire projection. */
export function projectControls(
  meta: Meta,
  props: Values,
  get: Get,
  mode?: "live" | "wire",
  ids?: readonly (string | undefined)[],
): Values {
  const selected = projectSelection(meta, props, get, mode, ids);
  return projectComponentSets(meta, projectNested(meta, selected, get, undefined, ids), get);
}
/** Preserve parsed values for component setters already applied to the wire. */
export function projectParsedControls(meta: Meta, props: Values, get: Get, runtime: boolean): Values {
  const selected = meta.select?.choices ? props : projectLegacySelection(meta, props, get);
  const nested = projectNested(meta, selected, get);
  return runtime || meta.items?.set || meta.items?.adjust || hasLiveAdjustments(meta)
    ? projectAdjustments(meta, nested, get)
    : nested;
}

/** Compose addressed rows and staged edits before resolving clock inputs. */
export function projectLiveControlInput(
  meta: Meta,
  validated: Values,
  get: Get,
  wireApplied: boolean,
  data?: DeviceData,
) {
  const moved = projectDerivedMoves(meta, validated, get);
  const addressed = projectRecordIds(meta, projectDeviceRows(meta, moved, data), get);
  const runtime = Boolean(get("$runtime"));
  if (wireApplied) return projectParsedControls(meta, addressed, get, runtime);
  const props = projectControls(meta, addressed, get);
  return meta.items?.set || meta.items?.adjust || runtime || hasLiveAdjustments(meta)
    ? projectAdjustments(meta, props, get)
    : props;
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
  const { draw, emptyActions, errorActions, successActions, session } = meta;
  const runtime = Boolean(get("$runtime"));
  let props = projectLiveControlInput(meta, validated, get, wireApplied, data);
  const timed = projectLiveClocks(
    meta,
    props,
    get,
    runtime || !!(meta.live || meta.recordRuntime?.actions),
    data,
  );
  if (timed !== props) props = timed;
  else if (draw || emptyActions?.length || errorActions?.length || successActions?.length || session) {
    const state = get("$state");
    if (state !== undefined) props = { ...props, state };
  }
  props = projectLocalState(meta, projectDraw(meta, props, get), validated, get);
  props = projectLiveInputs(meta, props, instance, get, data, validated);
  props = projectRecordRuntime(meta, props, instance, values, data, now);
  props = projectCollections(meta, props, get);
  // Reapply to rows that a live or host projection may have replaced.
  if (meta.select?.runtime) props = projectLegacySelection(meta, props, get);
  props = projectDeviceFlags(meta, props, data);
  props = projectDateSpan(meta, projectSequence(meta, props, get), get(dateSpanKey));
  if (runtime && meta.id === "Counter" && Number(props.value) < Number(props.step ?? 1))
    props = { ...props, minus: undefined };
  if (meta.id === "Field" || meta.id === "Search") {
    const value = values[`${instance}/field/$draft`] ?? values[`${instance}/field`];
    if (value !== undefined && props.kind !== "repeat" && props.kind !== "photo")
      props = { ...props, value: String(value) };
  }
  const key = meta.items?.key;
  if (!key || !Array.isArray(props[key])) return projectBuzz(meta, props, get);
  let items = props[key] as Values[];
  if (meta.items?.visible === "first") items = items.slice(Number(values[`${instance}/$cursor`] ?? 0));
  if (meta.id === "List" && props.style === "expand")
    items = items.map((item) =>
      values[`${instance}/${String(item.id)}`] === false ? { ...item, body: undefined } : item,
    );
  return projectBuzz(meta, { ...props, [key]: items }, get);
}

export function localValues(screen: string, values: Values): Values {
  return Object.fromEntries(
    Object.entries(values).map(([address, value]) => [address.replace(`${screen}/`, ""), value]),
  );
}

export function projectLiveInput(
  def: Definition,
  input: Values,
  id: string,
  local: Values,
  data?: DeviceData,
  now?: number,
) {
  const parsed = parseControlProps(def, input, (part) => local[`${id}/${part}`]);
  return liveProps(def.meta, parsed, id, local, true, data, now);
}

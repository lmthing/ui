import type { Definition } from "../../probes";
import type { Meta } from "../../meta";
import type { Values } from "../act";

type Edit = { path: readonly (string | number)[]; value: unknown };
type Edits = Readonly<Record<string, Edit>>;
export const wireEditKey = "$reportEdits";
const recordWireKey = "$recordEdits";
type RecordEdits = Readonly<Record<string, Values>>;

export function recordPartition(meta: Meta, props: Values) {
  const week = meta.clocks?.find(({ commitOnStop }) => commitOnStop)?.commitOnStop?.week;
  const fields = meta.items?.records?.scope ?? (week ? [week] : []);
  return JSON.stringify(fields.map((field) => props[field]));
}

function validPath(source: unknown, [key, ...rest]: Edit["path"]): boolean {
  if (key === undefined) return false;
  if (Array.isArray(source))
    return typeof key === "number" && Object.hasOwn(source, key) && validPath(source[key], rest);
  if (!source || typeof source !== "object" || typeof key !== "string") return false;
  if (["__proto__", "prototype", "constructor"].includes(key)) return false;
  return !rest.length || (Object.hasOwn(source, key) && validPath((source as Values)[key], rest));
}

function replace(source: unknown, [key, ...rest]: Edit["path"], value: unknown): unknown {
  if (key === undefined) return value;
  if (
    Array.isArray(source) &&
    typeof key === "number" &&
    Number.isInteger(key) &&
    key >= 0 &&
    key < source.length
  ) {
    const next = replace(source[key], rest, value);
    return next === source[key] ? source : source.map((row, index) => (index === key ? next : row));
  }
  if (!source || typeof source !== "object" || Array.isArray(source) || typeof key !== "string")
    return source;
  if (["__proto__", "prototype", "constructor"].includes(key)) return source;
  const before = Object.hasOwn(source, key) ? (source as Values)[key] : undefined;
  const next = replace(before, rest, value);
  if (next === before) return source;
  if (next !== undefined) return { ...source, [key]: next };
  const { [key]: _removed, ...result } = source as Values;
  return result;
}

export function applyReportEdits(meta: Meta, input: Values, get: (part: string) => unknown): Values {
  const edits = get(wireEditKey) as Edits | undefined;
  if (!meta.items?.edits && !meta.signOff) return input;
  return Object.values(edits ?? {}).reduce(
    (wire, { path, value }) => replace(wire, path, value) as Values,
    input,
  );
}

export function applyRecordWire(meta: Meta, input: Values, get: (part: string) => unknown) {
  if (!meta.items?.records && !meta.clocks?.some(({ commitOnStop }) => commitOnStop)) return input;
  const patch = (get(recordWireKey) as RecordEdits | undefined)?.[recordPartition(meta, input)];
  return patch ? { ...input, ...patch } : input;
}

/** Validate the whole mutation once, including any cross-field schema refinements. */
export function validRecordWire(def: Definition, wire: Values, patch: Values) {
  return (
    Object.keys(patch).every((key) => Object.hasOwn(def.props.shape, key)) &&
    def.props.safeParse({ ...wire, ...patch }).success
  );
}

export function writeRecordWire(meta: Meta, wire: Values, values: Values, base: string, patch: Values) {
  const slot = `${base}/${recordWireKey}`;
  const scope = recordPartition(meta, wire);
  const edits = values[slot] as RecordEdits | undefined;
  values[slot] = { ...edits, [scope]: { ...edits?.[scope], ...patch } };
}

export function writeWireEdit(def: Definition, wire: Values, values: Values, slot: string, edit: Edit) {
  if (!validPath(wire, edit.path)) return false;
  const next = replace(wire, edit.path, edit.value) as Values;
  if (!def.props.safeParse(next).success) return false;
  values[slot] = { ...(values[slot] as Edits | undefined), [JSON.stringify(edit.path)]: edit };
  return true;
}

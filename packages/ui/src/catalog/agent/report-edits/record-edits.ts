import type { Meta, RecordEdits } from "../../meta";
import type { Definition } from "../../probes";
import type { ActStep, Values } from "../act";
import { recordKey, selectDeviceData, stageRecordSnapshot, type DeviceData } from "../device-data";
import { visibleItems } from "../visibility";
import { recordPartition, validRecordWire, writeRecordWire } from "./wire-edits";
import { rememberRecordIds } from "./record-ids";

type Claim = Readonly<{ key: string; scope: string; date?: unknown }>;
type Target = { row: Values; claim: Claim; spec: RecordEdits["parts"][string] };
type Input = { def: Definition; wire: Values; props: Values; base: string; data?: DeviceData | undefined };

export function recordEdit(meta: Meta, part: string) {
  const parts = meta.items?.records?.parts;
  return parts && Object.hasOwn(parts, part) ? parts[part] : undefined;
}

export function isRecordAction(meta: Meta, target: string, action: string) {
  const [row, part, extra] = target.split("/");
  return Boolean(row && part && extra === undefined && recordEdit(meta, part)?.action === action);
}

function targetAt(meta: Meta, props: Values, target: string, action: string): Target | undefined {
  if (!isRecordAction(meta, target, action)) return;
  const [id, part] = target.split("/");
  const spec = recordEdit(meta, part!)!;
  const row = visibleItems(meta, props).find((row) => row.id === id);
  const key = row && recordKey(row, meta.items!.records!.keys);
  if (key !== undefined && row)
    return {
      row,
      spec,
      claim: {
        key,
        scope: recordPartition(meta, props),
        ...(spec.action === "check" && { date: row[spec.date] }),
      },
    };
}

export const recordClaimAt = (meta: Meta, props: Values, target: string, action: string) =>
  targetAt(meta, props, target, action)?.claim;

export function recordRequestAllowed(meta: Meta, props: Values, target: string, step: ActStep) {
  const claim = recordClaimAt(meta, props, target, step.action);
  return Boolean(
    claim &&
    (step.action !== "check" || step.value === undefined || step.value !== (claim.date !== undefined)),
  );
}

export function recordEditAllowed(
  meta: Meta,
  props: Values,
  row: Values,
  part: string,
  action: string,
  data?: DeviceData,
) {
  const spec = recordEdit(meta, part);
  if (!spec) return undefined;
  const { keys, canRemove } = meta.items!.records!;
  return (
    spec.action === action &&
    recordKey(row, keys) !== undefined &&
    (spec.action !== "press" || (canRemove?.(row, props, selectDeviceData(meta, data)) ?? true))
  );
}

function localDate(now: number) {
  const date = new Date(now);
  if (!Number.isFinite(date.valueOf())) return;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${String(date.getFullYear()).padStart(4, "0")}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function nextRow(target: Target, value: unknown, records: RecordEdits, now: number, data: DeviceData) {
  const { row, spec } = target;
  if (spec.action === "press") return undefined;
  const { [spec.date]: before, ...rest } = row;
  const accept = value ?? before === undefined;
  if (!accept) return before === undefined ? false : rest;
  if (before !== undefined) return false;
  const date = records.localDate ? records.localDate(now, data) : localDate(now);
  return date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? { ...rest, [spec.date]: date } : false;
}

export function stageRecordEdit(
  { def, wire, props, base, data }: Input,
  values: Values,
  target: string,
  step: ActStep,
  now: number,
  claim?: Claim,
) {
  const { meta } = def;
  const items = meta.items!;
  const records = items.records!;
  const edit = targetAt(meta, props, target, step.action);
  if (
    !claim ||
    !edit ||
    claim.key !== edit.claim.key ||
    claim.date !== edit.claim.date ||
    claim.scope !== edit.claim.scope
  )
    return false;
  if (!recordEditAllowed(meta, props, edit.row, target.split("/")[1]!, step.action, data)) return false;
  const rows = wire[items.key];
  if (!Array.isArray(rows)) return false;
  const indices = rows.flatMap((row: Values, index) =>
    recordKey(row, records.keys) === claim.key ? [index] : [],
  );
  if (indices.length !== 1) return false;
  const index = indices[0]!;
  const result = nextRow(
    { ...edit, row: rows[index] },
    step.value,
    records,
    now,
    selectDeviceData(meta, data),
  );
  if (result === false) return false;
  const patch: Values = {
    [items.key]: rows.flatMap((row, at) => (at !== index ? [row] : result ? [result] : [])),
  };
  if (records.revision) {
    const revision = props[records.revision];
    if (typeof revision !== "number" || !Number.isSafeInteger(revision + 1)) return false;
    patch[records.revision] = revision + 1;
  }
  if (!validRecordWire(def, wire, patch)) return false;
  const snapshot = records.snapshot;
  if (snapshot) {
    const { kind, keys, record, include } = snapshot;
    const key = recordKey(record(rows[index], props), keys);
    if (key === undefined || !meta.deviceData?.includes(kind)) return false;
    const row = result && include(result) ? record(result, { ...props, ...patch }) : undefined;
    if (row && recordKey(row, keys) !== key) return false;
    stageRecordSnapshot(values, { source: base, kind, keys, key, ...(row && { row }) });
  }
  writeRecordWire(meta, wire, values, base, patch);
  rememberRecordIds(meta, props, values, base);
  return true;
}

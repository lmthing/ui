import type { Values } from "../act";
import type { DeviceData } from "./index";

type Row = Readonly<Values>;
type Change = { source: string; kind: string; keys: readonly string[]; key: string; row?: Row };
export const recordSnapshotKey = "$recordSnapshots";

export function recordKey(row: Row, fields: readonly string[]) {
  const parts = fields.map((field) => row[field]);
  if (!parts.length || !parts.some((value) => value !== undefined)) return;
  if (parts.every((value) => value === undefined || typeof value === "string" || Number.isFinite(value)))
    return JSON.stringify(parts);
}

function snapshots(values: Values): readonly Change[] {
  return (values[recordSnapshotKey] as readonly Change[] | undefined) ?? [];
}

export function stageRecordSnapshot(values: Values, change: Change) {
  values[recordSnapshotKey] = [
    ...snapshots(values).filter(
      (old) => old.source !== change.source || old.kind !== change.kind || old.key !== change.key,
    ),
    change,
  ];
}

export function projectDeviceData(data: DeviceData | undefined, values: Values): DeviceData | undefined {
  for (const { kind, keys, key, row } of snapshots(values)) {
    const previous = data && Object.hasOwn(data, kind) ? (data[kind] ?? []) : [];
    const next = previous.filter(
      (record) => !record || typeof record !== "object" || recordKey(record as Row, keys) !== key,
    );
    data = { ...data, [kind]: row ? [...next, row] : next };
  }
  return data;
}

export function resetRecordSnapshots(values: Values, screen: string) {
  if (Object.hasOwn(values, recordSnapshotKey))
    values[recordSnapshotKey] = snapshots(values).filter(({ source }) => !source.startsWith(`${screen}/`));
}

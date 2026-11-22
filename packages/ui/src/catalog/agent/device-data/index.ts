import type { Meta } from "../../meta";
import type { Definition } from "../../probes";
import { stampItemIds } from "../../lines";
import type { ScreenLike, Values } from "../index";
import { hasRecordClock, hasTimestampClock } from "../clocks";

const deviceTime = Symbol("deviceTime");

/** Host-owned record snapshots, keyed by kind. Components narrow the records they consume. */
export type DeviceData = Readonly<Partial<Record<string, readonly unknown[]>>> & {
  readonly [deviceTime]?: number;
};
export const emptyDeviceData: DeviceData = Object.freeze({});
export const deviceTimeOf = (data?: DeviceData) => data?.[deviceTime];

/** Bind a host clock sample to a snapshot without adding a record kind or touching interaction values. */
export function atDeviceTime(data: DeviceData | undefined, now: number): DeviceData {
  return Object.create(null, {
    ...Object.getOwnPropertyDescriptors(data ?? emptyDeviceData),
    [deviceTime]: { value: now, enumerable: true },
  });
}

export function captureDeviceTime(
  defs: Record<string, Definition>,
  data?: DeviceData,
  now = Date.now(),
): DeviceData | undefined {
  return data?.[deviceTime] === undefined &&
    Object.values(defs).some(
      ({ meta }) =>
        meta.deviceDataFlags || meta.recordRuntime || hasRecordClock(meta) || hasTimestampClock(meta),
    )
    ? atDeviceTime(data, now)
    : data;
}

/** Only explicitly declared kinds from the host's own keys reach a component. */
export function selectDeviceData(meta: Meta, data: DeviceData = emptyDeviceData): DeviceData {
  if (!meta.deviceData?.length) return emptyDeviceData;
  return Object.fromEntries(
    meta.deviceData.filter((kind) => Object.hasOwn(data, kind)).map((kind) => [kind, data[kind]]),
  );
}

/** The rule sees only declared host-owned kinds, even if the caller supplies other records. */
export function isDeviceDataVisible(meta: Meta, data?: DeviceData): boolean {
  return meta.deviceDataVisible?.(selectDeviceData(meta, data)) ?? true;
}

export function filterDeviceDataScreen(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  data?: DeviceData,
): ScreenLike {
  const components = screen.components.filter(({ c }) => !defs[c] || isDeviceDataVisible(defs[c].meta, data));
  return components.length === screen.components.length ? screen : { ...screen, components };
}

/** Validate the projection before stamping; host or Writer IDs cannot supply addresses. */
export function projectDeviceRows(meta: Meta, props: Values, data?: DeviceData): Values {
  const items = meta.items;
  if (!items?.deviceData) return props;
  const { rows, schema } = items.deviceData;
  const projected = rows(selectDeviceData(meta, data), props).flatMap((row) => {
    const result = schema.safeParse(row);
    return result.success ? [result.data] : [];
  });
  return stampItemIds(meta, { ...props, [items.key]: projected });
}

export function projectDeviceFlags(meta: Meta, props: Values, data?: DeviceData): Values {
  if (!meta.deviceDataFlags) return props;
  const selected = selectDeviceData(meta, data);
  const now = data?.[deviceTime] ?? Date.now();
  const flags = Object.fromEntries(
    Object.entries(meta.deviceDataFlags).map(([key, project]) => [
      key,
      project(selected, props, now) === true,
    ]),
  );
  return { ...props, ...flags };
}

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

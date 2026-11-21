import type { Meta } from "../../meta";
import type { Definition } from "../../probes";
import { stampItemIds } from "../../lines";
import type { ScreenLike, Values } from "../index";
export { inLocalWeek } from "./local-week";
export {
  projectDeviceData,
  recordKey,
  recordSnapshotKey,
  resetRecordSnapshots,
  stageRecordSnapshot,
} from "./record-snapshot";

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
  return data?.[deviceTime] === undefined && Object.values(defs).some(({ meta }) => meta.deviceDataFlags)
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

import type { Meta } from "../../meta";

/** Host-owned record snapshots, keyed by kind. Components narrow the records they consume. */
export type DeviceData = Readonly<Partial<Record<string, readonly unknown[]>>>;
export const emptyDeviceData: DeviceData = Object.freeze({});

/** Only explicitly declared kinds from the host's own keys reach a component. */
export function selectDeviceData(meta: Meta, data: DeviceData = emptyDeviceData): DeviceData {
  if (!meta.deviceData?.length) return emptyDeviceData;
  return Object.fromEntries(
    meta.deviceData.filter((kind) => Object.hasOwn(data, kind)).map((kind) => [kind, data[kind]]),
  );
}

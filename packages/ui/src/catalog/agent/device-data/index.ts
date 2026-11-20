import type { Meta } from "../../meta";
import type { Definition } from "../../probes";
import type { ScreenLike } from "../index";

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

import { createContext, useContext, useSyncExternalStore } from "react";
import {
  activeParentId,
  emptyDeviceData,
  linkedEditKey,
  nestedControls,
  nestedRemaining,
  projectControls,
  projectLiveInputs,
  type DeviceData,
  type Meta,
  type Values,
} from "../../catalog";
import { usePartContext } from "../part";
import { useKit } from "../provider";
const subscribeNone = () => () => {};
export const DeviceDataContext = createContext<DeviceData | undefined>(undefined);

/** Get the host's declared records for the current component, outside its parsed props. */
export function useDeviceData() {
  const { component } = usePartContext();
  const { controller } = useKit();
  const data = useContext(DeviceDataContext);
  return controller?.deviceDataFor(component, data) ?? emptyDeviceData;
}

/** Use the same store-backed presentation and derived gates as the reader and dispatcher. */
export function useLiveControls(meta: Meta, props: Values): Values {
  const { controller: host } = useKit();
  const { screen, component } = usePartContext();
  const controller = meta.linkedEdits ? host : undefined;
  const data = useContext(DeviceDataContext);
  const subscribe = controller?.store.subscribe ?? subscribeNone;
  useSyncExternalStore(
    subscribe,
    () => controller?.store.get(`${screen}/${component}/${linkedEditKey}`),
    () => controller?.store.get(`${screen}/${component}/${linkedEditKey}`),
  );
  // Recheck the controller's snapshot after commit, when PhoneScreen publishes refreshed host data.
  useSyncExternalStore(
    subscribe,
    () => controller?.deviceData,
    () => controller?.deviceData,
  );
  return (
    host?.liveControls(meta, props, component) ??
    projectLiveInputs(meta, props, component, () => undefined, data)
  );
}
export function useControlValue<T>(address: string, fallback: T): T {
  const { controller } = useKit();
  return useSyncExternalStore(
    controller?.store.subscribe ?? subscribeNone,
    () => (controller?.store.get(address) as T) ?? fallback,
    () => fallback,
  );
}

/** PhoneScreen subscribes to the controller store; static renderers use their parsed props. */
export function useNestedControls(meta: Meta, props: Values) {
  const { controller } = useKit();
  const { screen, component } = usePartContext();
  const get = (part: string) => controller?.store.get(`${screen}/${component}/${part}`);
  const live = projectControls(meta, props, get);
  const controls = nestedControls(meta, live, get);
  const remaining = nestedRemaining(meta, live, controls);
  return {
    parent: activeParentId(meta, live, get),
    remaining,
    controls: controls
      .filter(({ enabled }) => enabled)
      .map((control) => ({
        ...control,
        disabled:
          remaining !== undefined &&
          remaining < (control.togglePeers?.length ?? 0) &&
          control.item[control.spec.prop] !== true,
      })),
  };
}

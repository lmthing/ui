import { useSyncExternalStore } from "react";
import {
  activeParentId,
  nestedControls,
  nestedRemaining,
  projectControls,
  type Meta,
  type Values,
} from "../../catalog";
import { usePartContext } from "../part";
import { useKit } from "../provider";
const subscribeNone = () => () => {};
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
